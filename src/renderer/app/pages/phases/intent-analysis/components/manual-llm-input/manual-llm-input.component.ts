import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../../../../services/electron.service';
import { PhaseId } from '../../../../../../../shared/phase-descriptor';

// ─── Validation helpers ────────────────────────────────────────────────────────

interface ValidationState {
  readonly valid: boolean;
  readonly errorMessage: string | null;
}

function validateIntentModelJson(raw: string): ValidationState {
  if (raw.trim() === '') {
    return { valid: false, errorMessage: null }; // empty — no error shown yet
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, errorMessage: 'Invalid JSON — check for missing commas, brackets, or quotes.' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, errorMessage: 'Response must be a JSON object, not an array or primitive.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj['flows'])) {
    return { valid: false, errorMessage: 'Missing required field: "flows" must be an array.' };
  }
  if (obj['flows'].length === 0) {
    return { valid: false, errorMessage: '"flows" array is empty — the chatbot must return at least one flow.' };
  }
  if (!Array.isArray(obj['globalEvents'])) {
    return { valid: false, errorMessage: 'Missing required field: "globalEvents" (can be an empty array []).' };
  }
  return { valid: true, errorMessage: null };
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-manual-llm-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './manual-llm-input.component.html',
  styleUrl: './manual-llm-input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualLlmInputComponent {
  private readonly electron = inject(ElectronService);

  // ── Inputs ────────────────────────────────────────────────────────────────
  /** Optional pre-selected file paths (parent may provide them). If empty, the
   *  component offers its own file picker so it is fully self-contained. */
  readonly filePaths = input<string[]>([]);

  // ── Outputs ───────────────────────────────────────────────────────────────
  /** Emits the raw validated JSON string when the user clicks Submit */
  readonly submitted = output<string>();

  // ── Internal file state ───────────────────────────────────────────────────
  protected readonly internalFilePaths = signal<string[]>([]);

  /** Effective file paths: parent-supplied ones first, then internally picked */
  protected readonly effectiveFilePaths = computed<string[]>(() => {
    const parent = this.filePaths();
    return parent.length > 0 ? parent : this.internalFilePaths();
  });

  // ── Prompt state ──────────────────────────────────────────────────────────
  protected readonly clipboardPrompt = signal<string>('');
  protected readonly isLoadingPrompt = signal(false);
  protected readonly promptError = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly isPickingFiles = signal(false);

  // ── JSON paste state ──────────────────────────────────────────────────────
  protected readonly pastedJson = signal<string>('');
  protected readonly validation = computed<ValidationState>(() =>
    validateIntentModelJson(this.pastedJson()),
  );

  protected readonly canSubmit = computed(
    () => this.validation().valid && this.pastedJson().trim() !== '',
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  async pickFiles(): Promise<void> {
    this.isPickingFiles.set(true);
    try {
      const paths = await this.electron.filesystem.selectFiles({
        title: 'Select documentation files',
        filters: [
          { name: 'Documentation', extensions: ['md', 'txt', 'pdf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (paths.length > 0) {
        this.internalFilePaths.set(paths);
        // Reset prompt when files change
        this.clipboardPrompt.set('');
        this.promptError.set(null);
      }
    } catch (err) {
      this.promptError.set(
        'Could not open file picker: ' + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      this.isPickingFiles.set(false);
    }
  }

  removeFile(filePath: string): void {
    this.internalFilePaths.update((paths) => paths.filter((p) => p !== filePath));
    this.clipboardPrompt.set('');
    this.promptError.set(null);
  }

  async loadPrompt(): Promise<void> {
    const paths = this.effectiveFilePaths();
    if (paths.length === 0) return;
    this.isLoadingPrompt.set(true);
    this.promptError.set(null);
    try {
      const result = await this.electron.phase.getPrompt({
        phaseId: PhaseId.IntentAnalysis,
        filePaths: paths,
      });
      this.clipboardPrompt.set(result.prompt);
    } catch (err) {
      this.promptError.set(
        'Could not generate prompt: ' + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      this.isLoadingPrompt.set(false);
    }
  }

  async copyToClipboard(): Promise<void> {
    const text = this.clipboardPrompt();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Fallback: textarea is readonly so user can Ctrl+A, Ctrl+C manually
    }
  }

  protected onJsonInput(value: string): void {
    this.pastedJson.set(value);
  }

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.submitted.emit(this.pastedJson().trim());
  }

  /** Returns just the filename portion of a full path for display */
  protected basename(filePath: string): string {
    return filePath.replace(/.*[\\/]/, '');
  }
}
