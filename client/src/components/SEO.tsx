const SITE_NAME = 'Zephyr';
const BASE_URL = 'https://www.zephyrapp.nz';
const DEFAULT_DESCRIPTION =
  'Zephyr is a weather station aggregator built for free flying in New Zealand. Browse live wind and weather data from stations across the country on an interactive map to make smarter, safer flying decisions.';
const DEFAULT_OG_IMAGE = `${BASE_URL}/logo512.png`;

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

/**
 * SEO component using React 19 native document metadata support.
 * Place `<title>` and `<meta>` tags directly in JSX — React 19
 * hoists them into `<head>` automatically.
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd
}: SEOProps) {
  const pageTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Live Wind & Weather for NZ Free Flying`;
  const canonicalUrl = `${BASE_URL}${path}`;

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_NZ" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}

export { SITE_NAME, BASE_URL, DEFAULT_DESCRIPTION };
