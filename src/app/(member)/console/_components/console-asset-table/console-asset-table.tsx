import { Eye, Package2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ConsoleAssetSnapshot } from "@/modules/console/types";

type ConsoleAssetTableProps = {
  assets: ConsoleAssetSnapshot[];
  onViewAsset: (asset: ConsoleAssetSnapshot) => void;
};

function formatDateTime(dateTime: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

export function ConsoleAssetTable({ assets, onViewAsset }: ConsoleAssetTableProps) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>Asset List</CardTitle>
        <CardDescription>Inventory asset yang masih aktif untuk subscription berjalan.</CardDescription>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <Empty className="border border-dashed border-border/60 bg-muted/10 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package2 />
              </EmptyMedia>
              <EmptyTitle>Belum ada asset aktif</EmptyTitle>
              <EmptyDescription>Belum ada asset aktif untuk subscription saat ini.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Id</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Asset type</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Proxy</TableHead>
                <TableHead>Expires at</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.assignmentId}>
                  <TableCell className="max-w-44 truncate font-medium text-foreground">{asset.id}</TableCell>
                  <TableCell className="capitalize">{asset.platform}</TableCell>
                  <TableCell className="capitalize">{asset.assetType}</TableCell>
                  <TableCell>{asset.note ?? "-"}</TableCell>
                  <TableCell>{asset.proxy ?? "-"}</TableCell>
                  <TableCell>{formatDateTime(asset.expiresAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => onViewAsset(asset)} size="sm" variant="outline">
                      <Eye data-icon="inline-start" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
