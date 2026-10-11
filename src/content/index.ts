import raw from '../../content/chapters.json';
import { normalizeContent } from './normalize';
import type { Chapter, Content } from './types';

export const content: Content = normalizeContent(raw as unknown);

export const findChapter = (id: string, c: Content = content): Chapter | undefined =>
  c.chapters.find((ch) => ch.id === id);
