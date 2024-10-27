"use client";

import "core-js/full/promise/with-resolvers";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocumentProxy, PDFPageProxy, PageViewport } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import { useRef, useState, ChangeEvent, useCallback, useEffect } from "react";

export default function Home() {
  // refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // values
  const [scale, setScale] = useState<number>(1.0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  // pdf canvas 에 렌더링
  const drawPdf = useCallback(
    async (pdfDoc: PDFDocumentProxy, scale: number, pageNumber: number) => {
      if (!pdfDoc) return;
      try {
        const page: PDFPageProxy = await pdfDoc!.getPage(pageNumber);
        const viewport: PageViewport = page.getViewport({ scale: scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const outputScale: number = window.devicePixelRatio || 1;

        const context = canvas.getContext("2d");
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.width = Math.floor(viewport.width * outputScale);

        // 캔버스 크기를 부모 요소에 맞춤
        canvas.style.height = `${containerRef.current!.offsetHeight}px`;

        const transform: number[] | null =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context!,
          viewport: viewport,
          transform: transform ?? undefined,
        };

        await page.render(renderContext).promise;
      } catch (error) {
        console.log("PDF 생성 에러: ", error);
      }
    },
    []
  );

  // 초기 배율 구하기
  const circulateInitScale = (page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1.0 });

    const container = containerRef.current;
    if (!container) return 1.0;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 너비와 높이 비율을 각각 계산한 후 작은 값 선택
    const widthScale = containerWidth / viewport.width;
    const heightScale = containerHeight / viewport.height;

    // 컨테이너에 맞추기 위해 너비와 높이 중 작은 비율을 사용
    return Math.min(widthScale, heightScale);
  };

  // pdf 파일 업로드 처리
  const loadPdf = useCallback(
    async (pdf: File) => {
      const fileReader: FileReader = new FileReader();
      const arrayBuffer: ArrayBuffer = await new Promise<ArrayBuffer>(
        (resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
          fileReader.onerror = reject;
          fileReader.readAsArrayBuffer(pdf);
        }
      );
      const loadedPdf: PDFDocumentProxy = await pdfjsLib.getDocument(
        arrayBuffer
      ).promise;
      const initScale: number = circulateInitScale(await loadedPdf.getPage(1));
      setScale(initScale);
      // 첫 페이지 그리기
      await drawPdf(loadedPdf, 1, 1);
    },
    [drawPdf]
  );

  // 파일 업로드 처리
  const fileUpload = (fileList: FileList | null) => {
    // 파일이 없는 경우
    if (!fileList) {
      alert("파일이 존재하지 않습니다.");
      fileRef.current!.value = "";
      return;
    }
    loadPdf(fileList[0]);
  };

  // 확대 및 축소 기능
  const handleZoom = (factor: number) => {
    const newScale = Math.min(10.0, Math.max(0.1, scale * factor));
  };

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
      <section className="h-full w-full overflow-auto">
        <article className="h-full w-full overflow-hidden">
          <div ref={containerRef} className="w-fit m-auto h-full overflow-auto">
            <canvas ref={canvasRef} />
          </div>
        </article>
      </section>
    </main>
  );
}
