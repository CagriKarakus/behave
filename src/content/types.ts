// content/chapters.json şeması. Normalleştirilmiş tipler (Chapter) her zaman tam doludur;
// ham tipler (RawChapter) eski taslak ve yeni sürümle uyumludur (eksik alanlar boş sayılır).

export type ChapterKind = 'intro' | 'chapter' | 'epilogue' | 'appendix';
export type Confidence = 'yüksek' | 'orta' | 'düşük';

export interface KeyConcept { term: string; explanation: string }
export interface KeyStudy { name: string; finding: string }
export type ReplicationStatus = 'sağlam' | 'karışık' | 'tartışmalı' | 'bilinmiyor';
export interface ExperimentSource { citation: string; journal: string | null; year: number | null; doi: string | null; url: string | null }
export interface Replication { status: ReplicationStatus; note: string; refs: string[] }
export interface Experiment {
  id: string; name: string; researchers: string; year: number | null;
  question: string; method: string; finding: string; roleInChapter: string;
  sources: ExperimentSource[]; caveats: string | null; replication: Replication | null; simulatable: boolean;
}
export interface SimulationIdea { title: string; shows: string; inputs: string[]; outputs: string[] }
export interface ChapterLink { to: string; why: string }

export interface Book { titleEn: string; titleTr: string; author: string; year: number | null }

/** Dosyadaki ham biçim. keyStudies eski taslakta yoktur. */
export interface RawChapter {
  id: string;
  kind: ChapterKind;
  number: number | null;
  titleEn: string;
  titleTr: string;
  timescale: string | null;
  timescaleSeconds: number | null;
  summary: string;
  keyConcepts: KeyConcept[];
  keyStudies?: KeyStudy[];
  experiments?: Experiment[];
  simulationIdeas: SimulationIdea[];
  links: ChapterLink[];
  confidence: Confidence;
  verifyNotes: string[];
}
export interface RawContent { book: Book; chapters: RawChapter[] }

export interface Chapter {
  id: string;
  kind: ChapterKind;
  number: number | null;
  titleEn: string;
  titleTr: string;
  timescale: string | null;
  timescaleSeconds: number | null;
  summary: string;
  keyConcepts: KeyConcept[];
  keyStudies: KeyStudy[];
  experiments: Experiment[];
  simulationIdeas: SimulationIdea[];
  links: ChapterLink[];
  confidence: Confidence | null;
  verifyNotes: string[];
}
export interface Content { book: Book; chapters: Chapter[] }
