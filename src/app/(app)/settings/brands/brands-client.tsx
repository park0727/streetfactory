"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmButton } from "@/components/confirm-button";
import { Panel, EmptyState } from "@/components/page-header";
import { uploadImage } from "@/lib/image-upload";
import { deleteBrand, saveBrand } from "./actions";

type Row = { id: number; name: string; logoUrl: string | null; sortOrder: number; partCount: number };

export function BrandsClient({ rows }: { rows: Row[] }) {
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> 브랜드 추가
        </Button>
      </div>
      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="등록된 브랜드가 없습니다" hint="‘브랜드 추가’를 눌러 이름과 로고 이미지를 올려 주세요." />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex h-12 w-32 shrink-0 items-center justify-center rounded border bg-white px-2">
                  {r.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 업로드 로고
                    <img src={r.logoUrl} alt={r.name} className="max-h-9 max-w-full object-contain" />
                  ) : (
                    <span className="text-[12px] text-steel">로고 없음</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-[12.5px] text-steel">부품 {r.partCount}개</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label={`${r.name} 수정`} title="수정">
                  <Pencil />
                </Button>
                <ConfirmButton action={deleteBrand.bind(null, r.id)} title={`'${r.name}' 삭제`} description={r.partCount > 0 ? `부품 ${r.partCount}개의 브랜드가 비워집니다. 부품 자체는 지워지지 않습니다.` : "브랜드를 지웁니다."} confirmLabel="삭제" destructive size="icon-sm" className="text-destructive" label={`${r.name} 삭제`}>
                  <Trash2 />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {editing && <BrandDialog key={editing === "new" ? "new" : editing.id} row={editing === "new" ? null : editing} nextSort={rows.length + 1} onClose={() => setEditing(null)} />}
    </>
  );
}

function BrandDialog({ row, nextSort, onClose }: { row: Row | null; nextSort: number; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(row?.name ?? "");
  const [logo, setLogo] = useState<string | null>(row?.logoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(f: File) {
    setUploading(true);
    try {
      setLogo(await uploadImage(f, "brand"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row ? "브랜드 수정" : "브랜드 추가"}</DialogTitle>
          <DialogDescription>로고는 배경이 투명한 PNG 나 SVG 가 가장 깔끔합니다. 가로로 긴 로고를 권합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="br-name">브랜드 이름</Label>
            <Input id="br-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 미쉐린" autoFocus maxLength={40} />
          </div>
          <div className="space-y-1.5">
            <Label>로고</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-44 items-center justify-center rounded border bg-white px-2">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 미리보기
                  <img src={logo} alt="로고 미리보기" className="max-h-12 max-w-full object-contain" />
                ) : (
                  <span className="text-[12px] text-steel">{uploading ? "올리는 중…" : "로고 없음"}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <ImagePlus /> {logo ? "로고 바꾸기" : "로고 올리기"}
                </Button>
                {logo && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogo(null)}>
                    로고 빼기
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[12px] text-steel">주문 화면에서는 타이어 사이즈 밑에 높이 16px 정도로 작게 보입니다.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={pending || uploading || !name.trim()}
            onClick={() =>
              start(async () => {
                const r = await saveBrand({ id: row?.id, name, logoUrl: logo, sortOrder: row?.sortOrder ?? nextSort });
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
