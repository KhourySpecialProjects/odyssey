type Props = {
  params: {
    slug: string;
    lessonSlug: string;
  };
};

export default function Lesson({ params }: Props) {
  return (
    <>
      <h1>{params.lessonSlug}</h1>
    </>
  );
}
