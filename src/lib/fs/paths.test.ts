import { describe, expect, test } from 'vitest';
import { basename, dirname, isMarkdownPath, joinPath, normalizePath, samePath } from './paths';

describe('paths', () => {
  test('isMarkdownPath', () => {
    expect(isMarkdownPath('C:\\Notas\\README.MD')).toBe(true);
    expect(isMarkdownPath('/a/b.txt')).toBe(true);
    expect(isMarkdownPath('/a/b.md.exe')).toBe(false);
  });

  test('joinPath resolves relative and percent-encoding', () => {
    expect(joinPath('C:/Mis Notas', 'img/mi%20foto.png')).toBe('C:/Mis Notas/img/mi foto.png');
    expect(joinPath('/home/u/docs/sub', '../img/a.png')).toBe('/home/u/docs/img/a.png');
    expect(joinPath('C:\\Mis Notas', './b.md')).toBe('C:/Mis Notas/b.md');
  });

  test('dirname/basename with backslashes', () => {
    expect(dirname('C:\\Mis Notas\\Introducción.md')).toBe('C:/Mis Notas');
    expect(basename('C:\\Mis Notas\\Introducción.md')).toBe('Introducción.md');
  });

  test('samePath', () => {
    expect(samePath('C:\\A\\b.md', 'c:/a/B.md', true)).toBe(true);
    expect(samePath('/a/b.md', '/a/B.md', false)).toBe(false);
  });

  test('preserves UNC roots while normalizing duplicate separators', () => {
    expect(normalizePath('\\\\server\\\\share\\folder\\..\\file.md')).toBe(
      '//server/share/file.md',
    );
  });
});
