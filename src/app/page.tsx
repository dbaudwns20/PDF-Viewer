"use client";

import "core-js/full/promise/with-resolvers";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `${import(
  "pdfjs-dist/build/pdf.worker.min.mjs"
)}`;

import { useRef, ChangeEvent } from "react";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // values

  // pdf canvas 에 렌더링
  const drawPdf = async (buffer: ArrayBuffer) => {
    const pdfDoc = await pdfjsLib.getDocument(buffer).promise;

    // Get the first page of the PDF
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const outputScale: number = window.devicePixelRatio || 1;
    const context = canvas.getContext("2d");
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.width = Math.floor(viewport.width * outputScale);

    const transform: number[] | null =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

    const renderContext = {
      canvasContext: context!,
      viewport: viewport,
      transform: transform ?? undefined,
    };

    await page.render(renderContext).promise;
  };

  // pdf 파일 업로드 처리
  const loadPdf = (pdf: File) => {
    const fileReader: FileReader = new FileReader();
    fileReader.onload = async () => {
      const arrayBuffer: ArrayBuffer = fileReader.result as ArrayBuffer;
      await drawPdf(arrayBuffer);
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

  return (
    <main className="flex flex-col h-[100vh]">
      <header className="bg-[#f9f9fa] border border-b-[#b8b8b8] h-10 flex items-center px-3 justify-between">
        <span className="text-xl font-bold">PDF Viewer</span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-gray-100 font-medium rounded-lg text-sm px-2.5 py-1"
          >
            PDF
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
