/**
 * T103 — tabela de especificações escaneável (chave/valor).
 * Sem dados → não renderiza (seção omitida, nunca vazia).
 */
export function SpecsTable({
  attrs
}: {
  attrs: Array<{ name: string; value: string }>;
}) {
  if (attrs.length === 0) return null;
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {attrs.map((a, i) => (
          <tr key={`${a.name}-${i}`} className={i % 2 === 0 ? "bg-muted/30" : ""}>
            <th scope="row" className="w-2/5 border-b border-border/30 px-3 py-2 text-left font-medium">
              {a.name}
            </th>
            <td className="border-b border-border/30 px-3 py-2 text-muted-foreground">{a.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
