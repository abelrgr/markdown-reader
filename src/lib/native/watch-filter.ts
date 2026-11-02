import { samePath } from '../fs/paths';

export function isEventForFile(eventPaths: string[], target: string, caseInsensitive?: boolean): boolean {
  return eventPaths.some((path) => samePath(path, target, caseInsensitive));
}
