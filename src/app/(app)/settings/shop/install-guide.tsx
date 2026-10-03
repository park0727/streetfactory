"use client";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/page-header";

/** 거래처에게 보낼 주문 화면 주소와 휴대폰 홈 화면 추가 방법 */
export function InstallGuide({ origin }: { origin: string }) {
  const url = `${origin}/shop`;
  const msg = `[라이더매니아 부품 주문]\n아래 주소에서 발급받은 계정으로 로그인하면 부품을 주문할 수 있습니다.\n${url}\n\n휴대폰 홈 화면에 추가하면 앱처럼 쓸 수 있어요.\n· 아이폰: 사파리에서 열고 아래쪽 공유 버튼 → '홈 화면에 추가'\n· 안드로이드: 크롬에서 열고 오른쪽 위 ⋮ → '홈 화면에 추가'`;
  return (
    <Panel className="h-fit space-y-3 p-5">
      <p className="text-[14px] font-semibold">거래처에 보낼 안내</p>
      <p className="text-[12.5px] text-steel">아래 문구를 복사해서 문자나 카카오톡으로 보내 주세요. 계정과 비밀번호는 거래처 화면의 &lsquo;주문 계정&rsquo;에서 만든 것을 따로 알려 주시면 됩니다.</p>
      <pre className="rounded-md bg-muted p-3 text-[12px] whitespace-pre-wrap">{msg}</pre>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => navigator.clipboard?.writeText(msg).then(() => toast.success("안내 문구를 복사했습니다."))}>
          <Copy /> 안내 문구 복사
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href="/shop/login" target="_blank" rel="noopener">
            <ExternalLink /> 주문 화면 열어 보기
          </a>
        </Button>
      </div>
    </Panel>
  );
}
