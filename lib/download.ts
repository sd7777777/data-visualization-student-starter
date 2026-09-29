/** Shared local-file export; keep object URLs alive long enough for Safari. */
export function downloadFile(
  content: string,
  filename: string,
  type = 'text/plain;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
