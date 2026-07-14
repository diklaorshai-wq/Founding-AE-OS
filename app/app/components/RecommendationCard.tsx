import type { RecommendationResult } from "../lib/intelligence/recommendationEngine";

type RecommendationCardProps = {
  recommendation: RecommendationResult;
};

export function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  return (
    <section>
      <h2>Recommendation</h2>

      <p>Decision: {recommendation.decision}</p>
      <p>Confidence: {recommendation.confidence}%</p>
    </section>
  );
}