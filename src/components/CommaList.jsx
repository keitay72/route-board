// src/components/CommaList.jsx

export default function CommaList({ items, keyPrefix }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      {items.map((x, i) => (
        <span key={`${keyPrefix}-${x}-${i}`}>
          {x}
          {i < items.length - 1 && (
            <>
              {", "}
              <wbr />
            </>
          )}
        </span>
      ))}
    </>
  );
}
