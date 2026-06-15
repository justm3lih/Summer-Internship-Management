import { redirect } from "next/navigation";

/** İş kuralları: uygunluk notları artık Application letter ders tablosunda hesaplanır. */
export default function TranscriptPageRedirect() {
  redirect("/student/summer-training-letter");
}
