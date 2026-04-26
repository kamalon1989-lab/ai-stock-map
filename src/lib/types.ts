export type XY = { x: number; y: number };

export type Sector = {
  id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  position?: XY;
};

export type Company = {
  ticker: string;
  name: string;
  sectorId: string;
  oneLineSummary?: string;
  tags?: string[];
  public?: boolean;
  position?: XY; // 섹터 내 상대 좌표
  createdAt?: number;
  updatedAt?: number;
};

export type Block = {
  id: string;
  type: "doc";
  title: string;        // 섹션 제목 (예: "사업모델", "리스크")
  content: any;         // TipTap JSON
  order: number;
  updatedAt?: number;
};
