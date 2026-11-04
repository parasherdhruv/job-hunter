import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { CandidateProfile } from '@job-hunter/shared';
import { AppConfigService } from '../config/app-config.service';
import { extractPdfText } from '../common/utils/pdf-text';
import { CandidateService } from './candidate.service';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const MAX_EXTRACTED_CHARS = 20_000;

/**
 * Validates and stores an uploaded resume. Phase 1 keeps the file name and
 * extracted text only — raw file bytes are not persisted, which keeps the
 * storage and retention surface small until access controls are proven.
 */
@Injectable()
export class ResumeService {
  constructor(
    private readonly candidateService: CandidateService,
    private readonly config: AppConfigService,
  ) {}

  async store(file: Express.Multer.File | undefined): Promise<CandidateProfile> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    if (file.size > this.config.uploadMaxBytes) {
      throw new PayloadTooLargeException(
        `File exceeds the ${Math.round(this.config.uploadMaxBytes / 1024 / 1024)} MB limit.`,
      );
    }
    if (!this.isAllowed(file)) {
      throw new BadRequestException('Only PDF, DOC and DOCX files are accepted.');
    }

    const text = this.extractText(file).slice(0, MAX_EXTRACTED_CHARS);
    return this.candidateService.saveResume(file.originalname, text);
  }

  private isAllowed(file: Express.Multer.File): boolean {
    const name = file.originalname.toLowerCase();
    const extensionOk = ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
    return extensionOk && mimeOk;
  }

  private extractText(file: Express.Multer.File): string {
    if (file.mimetype === 'application/pdf') {
      return extractPdfText(file.buffer);
    }
    // DOC/DOCX are binary formats; text extraction is deferred to a later
    // phase. We still record the file name and let the user paste text.
    return '';
  }
}
