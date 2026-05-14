/**
 * Questionnaire Tool - Unified tool for asking single or multiple questions
 *
 * Single question: simple options list
 * Multiple questions: tab bar navigation between questions
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type Component, Editor, type EditorTheme, type Focusable, Key, matchesKey, Text, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { Type } from "typebox";

// NOTE: Why not use SelectList from @earendil-works/pi-tui?
//
// SelectList is a flat "pick one" component — it doesn't support multi-line
// description wrapping (collapses to single line), number-key quick-select,
// checkmarks for previously answered options, special "Type something" items
// with inline editor state, or clamped (non-wrapping) navigation. The
// questionnaire needs all of these as part of a composite UI (tab bar,
// prompt, options, editor, submit summary). Adopting SelectList would
// require intercepting most keys before it reaches SelectList anyway
// (Tab, numbers, Escape, Enter on submit tab), leaving only Up/Down
// delegated — net result: more code, fewer features. The custom
// renderOptions() + scrollOffset is ~35 lines of straightforward code
// that gives full control. See also: getKeybindings() for keybinding
// respect (the one genuine SelectList advantage) if wanted later.

// Types
interface QuestionOption {
	value: string;
	label: string;
	description?: string;
}

type RenderOption = QuestionOption & { isOther?: boolean };

interface Question {
	id: string;
	label: string;
	prompt: string;
	options: QuestionOption[];
	allowOther: boolean;
	default?: string;
}

interface Answer {
	id: string;
	value: string;
	label: string;
	wasCustom: boolean;
	index?: number;
}

interface QuestionnaireResult {
	questions: Question[];
	answers: Answer[];
	cancelled: boolean;
}

interface QuestionnaireToolParams {
	questions: Array<{
		id: string;
		label?: string;
		prompt: string;
		options: QuestionOption[];
		allowOther?: boolean;
		default?: string;
	}>;
}

// Schema
const QuestionOptionSchema = Type.Object({
	value: Type.String({ description: "The value returned when selected" }),
	label: Type.String({ description: "Display label for the option" }),
	description: Type.Optional(Type.String({ description: "Optional description shown below label" })),
});

const QuestionSchema = Type.Object({
	id: Type.String({ description: "Unique identifier for this question" }),
	label: Type.Optional(
		Type.String({
			description: "Short contextual label for tab bar, e.g. 'Scope', 'Priority' (defaults to Q1, Q2)",
		}),
	),
	prompt: Type.String({ description: "The full question text to display" }),
	options: Type.Array(QuestionOptionSchema, { description: "Available options to choose from", minItems: 1 }),
	allowOther: Type.Optional(Type.Boolean({ description: "Allow 'Type something' option (default: true)" })),
	default: Type.Optional(Type.String({ description: "Pre-selected option value. Sets initial cursor position to this option." })),
});

const MAX_QUESTIONS = 5;

const QuestionnaireParams = Type.Object({
	questions: Type.Array(QuestionSchema, {
		description: `Questions to ask the user (max ${MAX_QUESTIONS}). If you have more questions, ask them in a follow-up call.`,
		maxItems: MAX_QUESTIONS,
	}),
});

// No errorResult helper — validation errors are thrown so the framework
// sets isError: true on the tool result. This tells the LLM its call failed
// (bad input), distinct from user cancellation which returns cancelled: true.

const MAX_VISIBLE_OPTIONS = 10;

export default function questionnaire(pi: ExtensionAPI) {
	pi.registerTool({
		name: "questionnaire",
		label: "Questionnaire",
		description:
			`Ask the user one or more questions (max ${MAX_QUESTIONS}) and let them pick from options. Use for clarifying requirements, getting preferences, or confirming decisions. For a single question, shows a simple option list. For multiple questions, shows a tab-based interface. If you have more than ${MAX_QUESTIONS} questions, batch them into multiple calls.`,
		promptSnippet: "Ask the user one or more multiple-choice questions and return structured answers.",
		promptGuidelines: [
			"Use questionnaire when you need explicit user choices for requirements, preferences, scope, or confirmation.",
			"Use questionnaire with 1 question for a quick decision; use up to 5 questions for a small multi-step clarification flow.",
			"In questionnaire, provide clear option labels and stable option values; enable allowOther only when free-form input is useful.",
			"If questionnaire needs more than 5 questions, call questionnaire again in a follow-up batch.",
		],
		parameters: QuestionnaireParams,

		async execute(_toolCallId, params: QuestionnaireToolParams, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				throw new Error("UI not available (running in non-interactive mode)");
			}
			if (params.questions.length === 0) {
				throw new Error("No questions provided");
			}

			// Validate unique question IDs
			const seenIds = new Set<string>();
			for (const q of params.questions) {
				if (seenIds.has(q.id)) {
					throw new Error(
						`Duplicate question id "${q.id}". Each question must have a unique id.`,
					);
				}
				seenIds.add(q.id);
			}

			// Normalize questions with defaults
			const questions: Question[] = params.questions.map((q, i) => ({
				...q,
				label: q.label || `Q${i + 1}`,
				allowOther: q.allowOther !== false,
			}));

			// Resolve default option indices
			const defaultIndices: Map<string, number> = new Map();
			for (const q of questions) {
				if (q.default) {
					const idx = q.options.findIndex((o) => o.value === q.default);
					if (idx >= 0) defaultIndices.set(q.id, idx);
				}
			}

			const isMulti = questions.length > 1;
			const totalTabs = questions.length + 1; // questions + Submit

			const result = await ctx.ui.custom<QuestionnaireResult>((tui, theme, _kb, done) => {
				// State
				let currentTab = 0;
				let optionIndex = defaultIndices.get(questions[0]?.id) ?? 0;
				let scrollOffset = 0;
				let inputMode = false;
				let inputQuestionId: string | null = null;
				let cachedLines: string[] | undefined;
				let cachedWidth: number | undefined;
				let settled = false;
				const answers = new Map<string, Answer>();

				// Editor for "Type something" option
				const editorTheme: EditorTheme = {
					borderColor: (s) => theme.fg("accent", s),
					selectList: {
						selectedPrefix: (t) => theme.fg("accent", t),
						selectedText: (t) => theme.fg("accent", t),
						description: (t) => theme.fg("muted", t),
						scrollInfo: (t) => theme.fg("dim", t),
						noMatch: (t) => theme.fg("warning", t),
					},
				};
				const editor = new Editor(tui, editorTheme);

				// Helpers
				function refresh() {
					cachedLines = undefined;
					cachedWidth = undefined;
					tui.requestRender();
				}

				// External abort handler — cleaned up on normal completion to avoid leaking the closure
				function onAbort() {
					submit(true);
				}
				ctx.signal?.addEventListener("abort", onAbort, { once: true });

				function submit(cancelled: boolean) {
					if (settled) return;
					settled = true;
					ctx.signal?.removeEventListener("abort", onAbort);
					done({ questions, answers: Array.from(answers.values()), cancelled });
				}

				// Helper to restore optionIndex when navigating to a tab
				// Note: prev.index - 1 is always >= 0 here, not an off-by-one bug.
				// saveAnswer stores 1-based indices: number keys pass 1-9, Enter passes
				// optionIndex + 1. Custom answers have no index and are excluded by the
				// !prev.wasCustom guard. So prev.index is always >= 1, making (index - 1)
				// a safe 0-based conversion.
				function restoreOptionIndex() {
					const q = questions[currentTab];
					if (!q) { optionIndex = 0; scrollOffset = 0; return; }
					const prev = answers.get(q.id);
					if (prev && !prev.wasCustom && prev.index != null) {
						optionIndex = Math.min(prev.index - 1, q.options.length - 1);
					} else {
						optionIndex = defaultIndices.get(q.id) ?? 0;
					}
					scrollOffset = clampScrollOffset(optionIndex, currentOptions().length);
				}

				function clampScrollOffset(idx: number, total: number): number {
					if (total <= MAX_VISIBLE_OPTIONS) return 0;
					const maxOffset = total - MAX_VISIBLE_OPTIONS;
					return Math.max(0, Math.min(idx - Math.floor(MAX_VISIBLE_OPTIONS / 2), maxOffset));
				}

				function currentQuestion(): Question | undefined {
					return questions[currentTab];
				}

				function currentOptions(): RenderOption[] {
					const q = currentQuestion();
					if (!q) return [];
					const opts: RenderOption[] = [...q.options];
					if (q.allowOther) {
						opts.push({ value: "__other__", label: "Type something.", isOther: true });
					}
					return opts;
				}

				function allAnswered(): boolean {
					return questions.every((q) => answers.has(q.id));
				}

				function advanceAfterAnswer() {
					if (!isMulti) {
						submit(false);
						return;
					}
					if (currentTab < questions.length - 1) {
						currentTab++;
					} else {
						currentTab = questions.length; // Submit tab
					}
					restoreOptionIndex();
					refresh();
				}

				function saveAnswer(questionId: string, value: string, label: string, wasCustom: boolean, index?: number) {
					answers.set(questionId, { id: questionId, value, label, wasCustom, index });
				}

				// Editor submit callback
				editor.onSubmit = (value) => {
					if (!inputQuestionId) return;
					const trimmed = value.trim() || "(no response)";
					saveAnswer(inputQuestionId, trimmed, trimmed, true);
					inputMode = false;
					inputQuestionId = null;
					editor.setText("");
					editor.focused = false;
					advanceAfterAnswer();
				};

				function handleInput(data: string) {
					// Input mode: route to editor
					if (inputMode) {
						if (matchesKey(data, Key.escape)) {
							inputMode = false;
							inputQuestionId = null;
							editor.focused = false;
							editor.setText("");
							refresh();
							return;
						}
						editor.handleInput(data);
						refresh();
						return;
					}

					const q = currentQuestion();
					const opts = currentOptions();

					// Tab navigation (multi-question only)
					if (isMulti) {
						if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
							currentTab = (currentTab + 1) % totalTabs;
							restoreOptionIndex();
							refresh();
							return;
						}
						if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
							currentTab = (currentTab - 1 + totalTabs) % totalTabs;
							restoreOptionIndex();
							refresh();
							return;
						}
					}

					// Submit tab
					if (currentTab === questions.length) {
						if (matchesKey(data, Key.enter) && allAnswered()) {
							submit(false);
						} else if (matchesKey(data, Key.escape)) {
							submit(true);
						}
						return;
					}

					// Option navigation
					if (matchesKey(data, Key.up)) {
						optionIndex = Math.max(0, optionIndex - 1);
						scrollOffset = clampScrollOffset(optionIndex, opts.length);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						optionIndex = Math.min(opts.length - 1, optionIndex + 1);
						scrollOffset = clampScrollOffset(optionIndex, opts.length);
						refresh();
						return;
					}

					// Number key quick-select (1-9)
					if (q && data.length === 1) {
						const num = data.charCodeAt(0) - 48; // '1' = 49
						if (num >= 1 && num <= opts.length && num <= 9) {
							const opt = opts[num - 1];
							if (opt.isOther) {
								inputMode = true;
								inputQuestionId = q.id;
								editor.setText("");
								editor.focused = true;
								refresh();
								return;
							}
							saveAnswer(q.id, opt.value, opt.label, false, num);
							advanceAfterAnswer();
							return;
						}
					}

					// Select option (Enter)
					if (matchesKey(data, Key.enter) && q) {
						const opt = opts[optionIndex];
						if (opt.isOther) {
							inputMode = true;
							inputQuestionId = q.id;
							editor.setText("");
							editor.focused = true;
							refresh();
							return;
						}
						saveAnswer(q.id, opt.value, opt.label, false, optionIndex + 1);
						advanceAfterAnswer();
						return;
					}

					// Cancel
					if (matchesKey(data, Key.escape)) {
						submit(true);
					}
				}

				function render(width: number): string[] {
					if (cachedLines && cachedWidth === width) return cachedLines;

					const lines: string[] = [];
					const q = currentQuestion();
					const opts = currentOptions();

					// Helper to add truncated line
					const add = (s: string) => lines.push(truncateToWidth(s, width));

					add(theme.fg("accent", "─".repeat(width)));

					// Tab bar (multi-question only)
					if (isMulti) {
						const tabs: string[] = ["← "];
						for (let i = 0; i < questions.length; i++) {
							const isActive = i === currentTab;
							const isAnswered = answers.has(questions[i].id);
							const lbl = questions[i].label;
							const box = isAnswered ? "■" : "□";
							const color = isAnswered ? "success" : "muted";
							const text = ` ${box} ${lbl} `;
							const styled = isActive ? theme.bg("selectedBg", theme.fg("text", text)) : theme.fg(color, text);
							tabs.push(`${styled} `);
						}
						const canSubmit = allAnswered();
						const isSubmitTab = currentTab === questions.length;
						const submitText = " ✓ Submit ";
						const submitStyled = isSubmitTab
							? theme.bg("selectedBg", theme.fg("text", submitText))
							: theme.fg(canSubmit ? "success" : "dim", submitText);
						tabs.push(`${submitStyled} →`);
						add(` ${tabs.join("")}`);
						lines.push("");
					}

					// Helper to render options list with viewport scrolling
					function renderOptions() {
						const answered = q ? answers.get(q.id) : undefined;
						const total = opts.length;
						const needsScroll = total > MAX_VISIBLE_OPTIONS;
						const start = needsScroll ? scrollOffset : 0;
						const end = needsScroll ? Math.min(start + MAX_VISIBLE_OPTIONS, total) : total;
						for (let i = start; i < end; i++) {
							const opt = opts[i];
							const selected = i === optionIndex;
							const isOther = opt.isOther === true;
							const isPrevAnswer = answered && !isOther && answered.value === opt.value;
							const checkmark = isPrevAnswer ? theme.fg("success", " ✓") : "";
							const prefix = selected ? theme.fg("accent", "> ") : "  ";
							const color = selected ? "accent" : "text";
							// Mark "Type something" differently when in input mode
							if (isOther && inputMode) {
								add(prefix + theme.fg("accent", `${i + 1}. ${opt.label} ✎`));
							} else {
								add(prefix + theme.fg(color, `${i + 1}. ${opt.label}${checkmark}`));
							}
							if (opt.description) {
								for (const line of wrapTextWithAnsi(opt.description, Math.max(1, width - 5))) {
									add(`     ${theme.fg("muted", line)}`);
								}
							}
						}
						// Scroll indicator
						if (needsScroll) {
							const scrollText = `  (${optionIndex + 1}/${total})`;
							add(theme.fg("dim", truncateToWidth(scrollText, width - 2, "")));
						}
					}

					// Content
					if (inputMode && q) {
						for (const line of wrapTextWithAnsi(q.prompt, Math.max(1, width - 1))) {
							add(theme.fg("text", ` ${line}`));
						}
						lines.push("");
						// Show options for reference
						renderOptions();
						lines.push("");
						add(theme.fg("muted", " Your answer:"));
						for (const line of editor.render(width - 2)) {
							add(` ${line}`);
						}
						lines.push("");
						add(theme.fg("dim", " Enter to submit • Esc to cancel"));
					} else if (currentTab === questions.length) {
						add(theme.fg("accent", theme.bold(" Ready to submit")));
						lines.push("");
						for (const question of questions) {
							const answer = answers.get(question.id);
							if (answer) {
								const prefix = answer.wasCustom ? "(wrote) " : "";
								add(`${theme.fg("muted", ` ${question.label}: `)}${theme.fg("text", prefix + answer.label)}`);
							}
						}
						lines.push("");
						if (allAnswered()) {
							add(theme.fg("success", " Press Enter to submit"));
						} else {
							const missing = questions
								.filter((q) => !answers.has(q.id))
								.map((q) => q.label)
								.join(", ");
							add(theme.fg("warning", ` Unanswered: ${missing}`));
						}
					} else if (q) {
						for (const line of wrapTextWithAnsi(q.prompt, Math.max(1, width - 1))) {
							add(theme.fg("text", ` ${line}`));
						}
						lines.push("");
						renderOptions();
					}

					lines.push("");
					if (!inputMode) {
						const help = isMulti
							? " Tab/←→ navigate • ↑↓ or 1-9 select • Enter confirm • Esc cancel"
							: " ↑↓ or 1-9 select • Enter confirm • Esc cancel";
						add(theme.fg("dim", help));
					}
					add(theme.fg("accent", "─".repeat(width)));

					cachedLines = lines;
					cachedWidth = width;
					return lines;
				}

				// Focusable propagation: when the TUI gives this component focus,
				// forward it to the embedded Editor so it emits CURSOR_MARKER for
				// correct hardware cursor / IME candidate window positioning.
				let _focused = false;

				return {
					get focused() {
						return _focused;
					},
					set focused(value: boolean) {
						_focused = value;
						// Only tell the editor it's focused when we're in input mode,
						// so the hardware cursor only appears during text entry.
						editor.focused = value && inputMode;
						// Invalidate cache: editor.render() output changes with focused state
						// (CURSOR_MARKER for hardware cursor / IME positioning).
						cachedLines = undefined;
						cachedWidth = undefined;
					},
					render,
					invalidate: () => {
						cachedLines = undefined;
						cachedWidth = undefined;
					},
					handleInput,
				} as Component & Focusable;
			});

			if (result.cancelled) {
				return {
					content: [{ type: "text", text: "User cancelled the questionnaire" }],
					details: result,
				};
			}

			const answerLines = result.answers.map((a) => {
				const qLabel = questions.find((q) => q.id === a.id)?.label || a.id;
				if (a.wasCustom) {
					return `${qLabel}: user wrote: ${a.label}`;
				}
				return `${qLabel}: user selected: ${a.index}. ${a.label}`;
			});

			return {
				content: [{ type: "text", text: answerLines.join("\n") }],
				details: result,
			};
		},

		renderCall(args, theme, _context) {
			const qs = (args.questions as Question[]) || [];
			const count = qs.length;
			const labels = qs.map((q) => q.label || q.id).join(", ");
			let text = theme.fg("toolTitle", theme.bold("questionnaire "));
			text += theme.fg("muted", `${count} question${count !== 1 ? "s" : ""}`);
			if (labels) {
				text += theme.fg("dim", ` (${truncateToWidth(labels, 40)})`);
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme, _context) {
			const details = result.details as QuestionnaireResult | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}
			if (details.cancelled) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}
			const lines = details.answers.map((a) => {
				if (a.wasCustom) {
					return `${theme.fg("success", "✓ ")}${theme.fg("accent", a.id)}: ${theme.fg("muted", "(wrote) ")}${a.label}`;
				}
				const display = a.index ? `${a.index}. ${a.label}` : a.label;
				return `${theme.fg("success", "✓ ")}${theme.fg("accent", a.id)}: ${display}`;
			});
			return new Text(lines.join("\n"), 0, 0);
		},
	});
}
