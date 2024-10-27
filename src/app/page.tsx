"use client";

import "core-js/full/promise/with-resolvers";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";

import { useRef, useState, ChangeEvent, useEffect, useCallback } from "react";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // values
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState<number>(1.0);

  // pdf canvas 에 렌더링
  const drawPdf = useCallback(
    async (scale: number) => {
      const page = await pdfDoc!.getPage(1);
      const viewport = page.getViewport({ scale: scale });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const outputScale: number = window.devicePixelRatio || 1;

      const context = canvas.getContext("2d");
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.width = Math.floor(viewport.width * outputScale);

      // 캔버스 크기를 부모 요소에 맞춤
      canvas.style.width = "inherit";

      const transform: number[] | null =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: context!,
        viewport: viewport,
        transform: transform ?? undefined,
      };

      await page.render(renderContext).promise;
    },
    [pdfDoc]
  );

  // pdf 파일 업로드 처리
  const loadPdf = (pdf: File) => {
    const fileReader: FileReader = new FileReader();
    fileReader.onload = async () => {
      const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
      setPdfDoc(await pdfjsLib.getDocument(arrayBuffer).promise);
    };
    fileReader.readAsArrayBuffer(pdf);
  };

  // 파일 업로드 처리
  const fileUpload = (fileList: FileList | null) => {
    // 파일이 없는 경우
    if (!fileList) {
      alert("파일이 존재하지 않습니다.");
      fileRef.current!.value = "";
      return;
    }
    const file: File = fileList[0];
    loadPdf(file);
  };

  // 확대 및 축소 기능
  const handleZoom = (factor: number) => {
    const newScale = Math.min(10.0, Math.max(0.1, scale * factor));
    setScale(newScale);
  };

  useEffect(() => {
    if (!pdfDoc) return;
    drawPdf(scale);
  }, [pdfDoc, scale, drawPdf]);

  return (
    <main className="flex flex-col h-[100vh]">
      <header className="bg-[#f9f9fa] border border-b-[#b8b8b8] flex items-center px-3 py-1 justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-gray-100 font-medium rounded-lg text-sm px-2.5 py-1"
          >
            PDF 열기
          </button>
          <input
            type="file"
            className="hidden"
            ref={fileRef}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              fileUpload(e.target.files)
            }
          />
        </div>
        <div className="flex gap-1 items-center px-3 py-1">
          <button
            onClick={() => handleZoom(1.1)}
            className="py-1 w-8 bg-white border border-gray-300 rounded text-center"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(0.9)}
            className="py-1 w-8 bg-white border border-gray-300 rounded text-center"
          >
            -
          </button>
          <span className="">{Math.round(scale * 100)}%</span>
        </div>
      </header>
      <section className="h-full w-full overflow-hidden">
        <div className="w-full h-full overflow-auto" tabIndex={0}>
          <canvas ref={canvasRef} />
          <div
            ref={textLayerRef}
            className="absolute top-0 left-0 select-text"
            tabIndex={0}
          />
        </div>
      </section>
    </main>
  );
}
