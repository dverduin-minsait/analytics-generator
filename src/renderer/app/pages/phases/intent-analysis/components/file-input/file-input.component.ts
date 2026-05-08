/**
 * FileInputComponent — document file selection for Phase 1.
 *
 * Supports:
 * - Click to open OS file picker (via Electron IPC)
 * - Drag-and-drop from OS file explorer (File.path is available in Electron)
 * - Display + removal of selected files
 */
import {
  Component,
  ChangeDetectionStrategy,
  output,
  input,
  signal,
  inject,
} from '@angular/core';
import { ElectronService } from '../../../../../services/electron.service';

export interface SelectedFile {
  path: string;
  name: string;
}

@Component({
  selector: 'app-file-input',
  standalone: true,
  imports: [],
  templateUrl: './file-input.component.html',
  styleUrl: './file-input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileInputComponent {
  readonly files = input<SelectedFile[]>([]);
  readonly disabled = input<boolean>(false);
  readonly filesChanged = output<SelectedFile[]>();

  protected readonly isDragging = signal(false);

  private readonly electron = inject(ElectronService);

  protected async openFilePicker(): Promise<void> {
    if (this.disabled()) return;
    const paths = await this.electron.filesystem.selectFiles({
      title: 'Select Documentation Files',
      filters: [
        { name: 'Documentation', extensions: ['md', 'txt', 'pdf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (paths.length > 0) {
      this.addFiles(paths);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) {
      this.isDragging.set(true);
    }
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (this.disabled() || !event.dataTransfer) return;

    const droppedFiles = Array.from(event.dataTransfer.files);
    // In Electron, File objects have a `path` property with the absolute OS path
    const paths = droppedFiles
      .map((f) => (f as File & { path?: string }).path ?? f.name)
      .filter((p) => p.length > 0);

    this.addFiles(paths);
  }

  protected removeFile(index: number): void {
    const updated = this.files().filter((_, i) => i !== index);
    this.filesChanged.emit(updated);
  }

  private addFiles(paths: string[]): void {
    const existingPaths = new Set(this.files().map((f) => f.path));
    const newFiles: SelectedFile[] = paths
      .filter((p) => !existingPaths.has(p))
      .map((p) => ({
        path: p,
        name: p.split(/[/\\]/).pop() ?? p,
      }));

    if (newFiles.length > 0) {
      this.filesChanged.emit([...this.files(), ...newFiles]);
    }
  }
}
