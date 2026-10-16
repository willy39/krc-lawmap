import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <Link href="/" className="mt-4 inline-block underline">
        법규 나무로 돌아가기
      </Link>
    </div>
  );
}
