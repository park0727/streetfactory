import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, salesChannels, suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleList } from "./simple-list";
import { SupplierList } from "./supplier-list";
import { saveCategory, deleteCategory, saveChannel, deleteChannel } from "./actions";

export const metadata = { title: "기준 데이터" };

export default async function MasterDataPage() {
  await requireModule("parts");

  const [cats, channels, sups] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        sortOrder: categories.sortOrder,
        usage: sql<number>`(select count(*)::int from parts p where p.category_id = categories.id)`,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(salesChannels).orderBy(asc(salesChannels.sortOrder), asc(salesChannels.name)),
    db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        country: suppliers.country,
        contact: suppliers.contact,
        memo: suppliers.memo,
        isActive: suppliers.isActive,
        partCount: sql<number>`(select count(*)::int from parts p where p.supplier_id = suppliers.id)`,
      })
      .from(suppliers)
      .orderBy(asc(suppliers.name)),
  ]);

  return (
    <>
      <PageHeader title="기준 데이터" description="부품 카테고리, 해외 공급사, 판매채널을 관리합니다." />
      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">카테고리 ({cats.length})</TabsTrigger>
          <TabsTrigger value="suppliers">공급사 ({sups.length})</TabsTrigger>
          <TabsTrigger value="channels">판매채널 ({channels.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="pt-3">
          <SimpleList label="카테고리" rows={cats} usageLabel="부품 수" save={saveCategory} remove={deleteCategory} />
        </TabsContent>
        <TabsContent value="suppliers" className="pt-3">
          <SupplierList rows={sups} />
        </TabsContent>
        <TabsContent value="channels" className="pt-3">
          <SimpleList label="판매채널" rows={channels} save={saveChannel} remove={deleteChannel} />
        </TabsContent>
      </Tabs>
    </>
  );
}
