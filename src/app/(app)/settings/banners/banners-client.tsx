"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/confirm-button";
import { Panel, EmptyState } from "@/components/page-header";
import { uploadImage } from "@/lib/image-upload";
import { deleteBanner, moveBanner, saveBanner } from "./actions";

type Row = { id: number; imageUrl: string; title: string | null; linkUrl: string | null; active: boolean; startsOn: string | null; endsOn: string | null; sortOrder: number };
type Cat = { id: number; name: string };

function status(r: Row, today: string) {
  if (!r.active) return { label: "꺼짐", cls: "bg-muted text-steel" };
  if (r.startsOn && r.startsOn > today) return { label: `${r.startsOn} 시작`, cls: "bg-status-warn/10 text-status-warn" };
  if (r.endsOn && r.endsOn < today) return { label: "기간 끝남", cls: "bg-muted text-steel" };
  return { label: "보이는 중", cls: "bg-status-ok/10 text-status-ok" };
}

export function BannersClient({ rows, cats, today }: { rows: Row[]; cats: Cat[]; today: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [pending, start] = useTransition();
  const move = (id: number, dir: -1 | 1) => start(async () => { await moveBanner(id, dir); router.refresh(); });
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> 배너 추가
        </Button>
      </div>
      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="등록된 배너가 없습니다" hint="‘배너 추가’를 눌러 사진을 올리면 주문 화면 맨 위에 보입니다." />
        </Panel>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const st = status(r, today);
            return (
              <li key={r.id}>
                <Panel className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 배너 */}
                  <img src={r.imageUrl} alt={r.title ?? "배너"} className="aspect-[2/1] w-full rounded object-cover sm:w-56" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{r.title || "제목 없음"}</p>
                    <p className="text-[12.5px] text-steel">
                      {r.startsOn || r.endsOn ? `${r.startsOn ?? "언제부터나"} ~ ${r.endsOn ?? "계속"}` : "기간 제한 없음"}
                      {r.linkUrl && " · 누르면 이동"}
                    </p>
                    <Badge className={st.cls}>{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" disabled={pending || i === 0} onClick={() => move(r.id, -1)} aria-label="위로" title="위로"><ArrowUp /></Button>
                    <Button variant="ghost" size="icon-sm" disabled={pending || i === rows.length - 1} onClick={() => move(r.id, 1)} aria-label="아래로" title="아래로"><ArrowDown /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label="수정" title="수정"><Pencil /></Button>
                    <ConfirmButton action={deleteBanner.bind(null, r.id)} title="배너 삭제" description="이 배너를 지웁니다." confirmLabel="삭제" destructive size="icon-sm" className="text-destructive" label="배너 삭제"><Trash2 /></ConfirmButton>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
      {editing && <BannerDialog key={editing === "new" ? "new" : editing.id} row={editing === "new" ? null : editing} cats={cats} onClose={() => setEditing(null)} />}
    </>
  );
}

type LinkKind = "none" | "cat" | "q";
function parseLink(url: string | null): { kind: LinkKind; value: string } {
  if (!url) return { kind: "none", value: "" };
  const u = new URL(url, "https://x");
  if (u.searchParams.get("cat")) return { kind: "cat", value: u.searchParams.get("cat")! };
  if (u.searchParams.get("q")) return { kind: "q", value: u.searchParams.get("q")! };
  return { kind: "none", value: "" };
}

function BannerDialog({ row, cats, onClose }: { row: Row | null; cats: Cat[]; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const init = parseLink(row?.linkUrl ?? null);
  const [image, setImage] = useState(row?.imageUrl ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [kind, setKind] = useState<LinkKind>(init.kind);
  const [linkValue, setLinkValue] = useState(init.value);
  const [active, setActive] = useState(row?.active ?? true);
  const [startsOn, setStartsOn] = useState(row?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(row?.endsOn ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(f: File) {
    setUploading(true);
    try {
      setImage(await uploadImage(f, "banner"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }
  const linkUrl = kind === "cat" && linkValue ? `/?cat=${linkValue}` : kind === "q" && linkValue.trim() ? `/?q=${encodeURIComponent(linkValue.trim())}` : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? "배너 수정" : "배너 추가"}</DialogTitle>
          <DialogDescription>권장 크기는 가로 1200 × 세로 600 입니다. 큰 사진도 올리면 자동으로 줄여서 저장합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/40 hover:bg-muted" disabled={uploading}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- 미리보기
              <img src={image} alt="배너 미리보기" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-[13px] text-steel">
                <ImagePlus className="size-6" /> {uploading ? "올리는 중…" : "눌러서 사진 고르기"}
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {image && <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "올리는 중…" : "사진 바꾸기"}</Button>}
          <div className="space-y-1.5">
            <Label htmlFor="bn-title">설명 (화면 읽기용, 선택)</Label>
            <Input id="bn-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 미쉐린 시티그립2 입고 기념 할인" maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bn-kind">누르면 이동</Label>
              <Select value={kind} onValueChange={(v) => { setKind(v as LinkKind); setLinkValue(""); }}>
                <SelectTrigger id="bn-kind" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">이동 안 함</SelectItem>
                  <SelectItem value="cat">카테고리</SelectItem>
                  <SelectItem value="q">검색 결과</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bn-val">{kind === "cat" ? "카테고리" : kind === "q" ? "검색어" : " "}</Label>
              {kind === "cat" ? (
                <Select value={linkValue} onValueChange={setLinkValue}>
                  <SelectTrigger id="bn-val" className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : kind === "q" ? (
                <Input id="bn-val" value={linkValue} onChange={(e) => setLinkValue(e.target.value)} placeholder="예: 미쉐린" />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bn-from">시작일 (선택)</Label>
              <Input id="bn-from" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bn-to">종료일 (선택)</Label>
              <Input id="bn-to" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} /> 주문 화면에 보이기</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button
            disabled={pending || uploading || !image}
            onClick={() =>
              start(async () => {
                const r = await saveBanner({ id: row?.id, imageUrl: image, title: title.trim() || null, linkUrl, active, startsOn: startsOn || null, endsOn: endsOn || null });
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message);
                onClose();
                router.refresh();
              })
            }
          >
            {pending ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
