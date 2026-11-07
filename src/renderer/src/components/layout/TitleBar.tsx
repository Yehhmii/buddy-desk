/** Invisible drag strip. The native window buttons are drawn by Windows over the top-right corner. */
export default function TitleBar() {
  return <div className="drag fixed inset-x-0 top-0 z-10 h-11" aria-hidden="true" />;
}
