import Link from "next/link";

export function ServerEmpty({ title, detail, action = "/compare" }: { title: string; detail: string; action?: string }) {
  return <div className="empty-state"><h2>{title}</h2><p>{detail}</p><Link className="button button-secondary" style={{ marginTop: 20 }} href={action}>{action === "/compare" ? "Start with compare" : "Return to Eventum"}</Link></div>;
}

