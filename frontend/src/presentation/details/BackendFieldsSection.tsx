import type { Node } from "../../domain/spec";
import { formatShape } from "../components/ui/format";
import styles from "./GenericDetailPanel.module.css";

export function BackendFieldsSection({ node }: { node: Node }) {
  const rows = backendFieldRows(node);
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Backend fields</h3>
      <dl className={styles.kvGrid}>
        {rows.map(([key, value]) => (
          <Row key={key} k={key} v={value} />
        ))}
      </dl>
    </section>
  );
}

function backendFieldRows(node: Node): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["id", node.id],
    ["type", node.type],
    ["label", node.label],
    ["params", formatBackendValue(node.params)],
  ];

  addOptionalRow(rows, "meta", node.meta);
  addOptionalRow(rows, "module_class", node.module_class);
  addOptionalRow(rows, "module_path", node.module_path);
  addOptionalRow(rows, "children", formatChildren(node.children));
  addOptionalRow(rows, "has_internals", node.has_internals);
  addOptionalRow(rows, "param_count", node.param_count);
  addOptionalRow(rows, "input_shape", node.input_shape);
  addOptionalRow(rows, "output_shape", node.output_shape);
  addOptionalRow(rows, "weight_shape", formatShape(node.weight_shape));
  addOptionalRow(rows, "bias_shape", formatShape(node.bias_shape));
  addOptionalRow(rows, "memory_bytes", node.memory_bytes);
  addOptionalRow(rows, "buffers", node.buffers);
  addOptionalRow(rows, "category", node.category);
  addOptionalRow(rows, "source_url", node.source_url);
  addOptionalRow(rows, "flops", node.flops);
  addOptionalRow(rows, "intermediates", node.intermediates);

  return rows;
}

function addOptionalRow(
  rows: Array<[string, string]>,
  key: string,
  value: unknown,
): void {
  if (value == null) return;
  rows.push([key, formatBackendValue(value)]);
}

function formatChildren(children: Node["children"]): string | null {
  if (children == null) return null;
  return formatBackendValue(
    children.map((child) => ({
      id: child.id,
      type: child.type,
      label: child.label,
      module_class: child.module_class,
      param_count: child.param_count,
    })),
  );
}

function formatBackendValue(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className={styles.kvKey}>{k}</dt>
      <dd className={styles.kvValue}>{v}</dd>
    </>
  );
}
