import { Star } from "lucide-react";
import { getPublishedTestimonials } from "@/lib/testimonials";
import { RateGlitchgrabLink } from "@/components/rate-glitchgrab";
import { ReviewJsonLd } from "@/components/seo/json-ld";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rating
              ? "h-3 w-3 fill-amber-400 text-amber-400"
              : "h-3 w-3 text-muted-foreground/30"
          }
        />
      ))}
    </span>
  );
}

/**
 * Social proof, fed by the same feedback pipeline the SDK exposes to customers
 * (#309) — every quote here is an entry an owner pressed **publish** on in the
 * dashboard. Renders nothing at all until at least one is published, so the
 * page never ships an empty "what people say" shell.
 */
export async function TestimonialsSection() {
  const { items, average, count } = await getPublishedTestimonials();

  if (items.length === 0) return null;

  return (
    <>
      <ReviewJsonLd items={items} average={average} count={count} />
      <section id="testimonials" className="border-y border-border bg-card/30">
        <div className="max-w-360 mx-auto border-x border-border py-12 sm:py-16">
          <div className="px-4 sm:px-6 mb-10 flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-1">
                Social proof
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground uppercase tracking-tight">
                What Teams Say
              </h2>
              <p className="font-mono text-[10px] text-primary/70 mt-1.5">
                <span className="text-primary/40">{"//"}</span> collected with the same
                feedback widget you get in the SDK
              </p>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 border border-amber-400/40 text-amber-400 bg-amber-400/10 uppercase tracking-widest flex items-center gap-1.5">
              <Star className="h-3 w-3 fill-amber-400" />
              {average.toFixed(1)} / 5 · {count} {count === 1 ? "review" : "reviews"}
            </span>
          </div>

          <div className="px-4 sm:px-6 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
              {items.map((t) => (
                <figure
                  key={t.id}
                  className="bg-background p-6 flex flex-col gap-4 border-l-4 border-l-amber-400/40 hover:bg-card transition-colors"
                >
                  <Stars rating={t.rating} />
                  <blockquote className="font-mono text-[11px] text-muted-foreground leading-relaxed wrap-break-word">
                    &ldquo;{t.message}&rdquo;
                  </blockquote>
                  <figcaption className="mt-auto font-mono text-[10px] text-foreground border-t border-border pt-3">
                    {t.reporterName}
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-8 font-mono text-[10px] text-muted-foreground">
              Used Glitchgrab?{" "}
              <RateGlitchgrabLink
                label="Leave a review"
                className="text-primary hover:text-primary/80 underline underline-offset-2"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
