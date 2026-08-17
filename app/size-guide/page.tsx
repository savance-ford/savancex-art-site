import type { Metadata } from "next";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { CustomerCareNavigation } from "@/components/layout/CustomerCareNavigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Size Guide",
  alternates: { canonical: "/size-guide" },
};

export default function SizeGuidePage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container content-grid">
          <CustomerCareNavigation />
          <article className="prose">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Size guide" },
              ]}
            />
            <h1>Size guide</h1>
            <p>
              Use these placeholder garment measurements as a structural
              example. Replace them with measurements from your actual blanks
              before launch.
            </p>
            <div className="callout">
              <strong>How to measure:</strong> Lay a garment flat. Measure width
              one inch below the armhole, then measure length from the highest
              shoulder point to the hem.
            </div>
            <h2>T-Shirts</h2>
            <p>
              Standard unisex sizing. Vintage colorways are intentionally
              oversized.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Body width</th>
                  <th>Body length</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>S</td><td>18 in</td><td>29 in</td></tr>
                <tr><td>M</td><td>20 in</td><td>30 in</td></tr>
                <tr><td>L</td><td>22 in</td><td>31 in</td></tr>
                <tr><td>XL</td><td>24 in</td><td>31.5 in</td></tr>
                <tr><td>2XL</td><td>26 in</td><td>33 in</td></tr>
                <tr><td>3XL</td><td>28 in</td><td>35 in</td></tr>
              </tbody>
            </table>
            <h2>Hoodies</h2>
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest</th>
                  <th>Body length</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>S</td><td>21 in</td><td>28.5 in</td></tr>
                <tr><td>M</td><td>23 in</td><td>29.5 in</td></tr>
                <tr><td>L</td><td>24.5 in</td><td>30.5 in</td></tr>
                <tr><td>XL</td><td>26.5 in</td><td>31.5 in</td></tr>
                <tr><td>2XL</td><td>27.5 in</td><td>32.5 in</td></tr>
                <tr><td>3XL</td><td>28.5 in</td><td>33.5 in</td></tr>
              </tbody>
            </table>
            <h2>Crewnecks</h2>
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest</th>
                  <th>Body length</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>S</td><td>20 in</td><td>27 in</td></tr>
                <tr><td>M</td><td>22 in</td><td>28 in</td></tr>
                <tr><td>L</td><td>24 in</td><td>29 in</td></tr>
                <tr><td>XL</td><td>26 in</td><td>30 in</td></tr>
                <tr><td>2XL</td><td>28 in</td><td>31 in</td></tr>
                <tr><td>3XL</td><td>30 in</td><td>32 in</td></tr>
              </tbody>
            </table>
          </article>
        </div>
      </section>
    </main>
  );
}
