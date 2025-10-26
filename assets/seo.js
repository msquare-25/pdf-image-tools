(function () {
  // ---------- CONFIG ----------
  const ORIGIN = "https://pdf-image-tools-indol.vercel.app";
  const OG_IMAGE = ORIGIN + "/og/default.png"; // 1200x630 banner

  // Route → SEO map (ALL PAGES)
  const PAGES = {
    "/": {
      title: "PDF & Image Tools — Fast, Private, Free",
      desc: "All-in-one PDF & image utilities that run entirely in your browser: merge, crop, compress, convert, and more. No uploads. Fast and private.",
    },
    "/image-to-pdf": {
      title: "Image → PDF — JPG/PNG/WebP/AVIF/HEIC to PDF",
      desc: "Convert JPG/PNG/WebP/AVIF/HEIC to a single PDF locally in your browser. Private, fast, and free.",
    },
    "/pdf-to-images": {
      title: "PDF → Images — Export PDF pages to PNG/JPG",
      desc: "Export PDF pages to PNG or JPG at custom DPI — 100% client-side. Nothing leaves your device.",
    },
    "/compress": {
      title: "Compress PDF — Reduce Size, Keep Quality",
      desc: "Shrink large PDFs from scans or photos with smart presets. Runs fully offline in your browser.",
    },
    "/crop": {
      title: "Crop PDF — Select Area & Apply to Pages",
      desc: "Crop PDF pages by dragging a box; apply to one or all pages. Private and fast.",
    },
    "/merge": {
      title: "Merge PDF — Combine & Reorder Easily",
      desc: "Combine multiple PDFs, reorder pages, and download in one click — no uploads required.",
    },
    "/delete-pages": {
      title: "Delete PDF Pages — Remove & Save",
      desc: "Remove selected PDF pages and save a clean file — private, local processing only.",
    },
    "/reorder-pages": {
      title: "Reorder PDF Pages — Drag, Drop, Export",
      desc: "Rearrange PDF pages visually by drag & drop, then export. Everything stays on your device.",
    },
    "/rotate-pages": {
      title: "Rotate PDF Pages — Single or All",
      desc: "Rotate specific pages or the entire PDF, then save a new file — client-side only.",
    },
    "/png-to-jpg": {
      title: "PNG → JPG — Quick Converter",
      desc: "Convert PNG to JPG with adjustable quality. Batch-friendly and private.",
    },
    "/jpg-to-png": {
      title: "JPG → PNG — Lossless Converter",
      desc: "Convert JPG to lossless PNG (ZIP). Everything stays on your device.",
    },
    "/privacy": {
      title: "Privacy — No Uploads. No Retention.",
      desc: "We process your files locally in your browser. No servers, no tracking of your documents.",
    },
    "/terms": {
      title: "Terms — Simple & Human-Readable",
      desc: "Plain-language terms for using our client-side PDF & image tools.",
    },
    "/404": {
      title: "Page Not Found — PDF & Image Tools",
      desc: "This page doesn’t exist. Head back to our PDF & image tools home.",
    },
  };

  // ---------- HELPERS ----------
  const clean = p => (p || "/").replace(/\/$/, "") || "/";
  const path = clean(location.pathname);
  const data = PAGES[path] || PAGES["/"];
  const canonicalUrl = ORIGIN + (path === "/" ? "/" : path);

  function ensureMetaName(name, content) {
    if (!content) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }
  function ensureMetaProp(prop, content) {
    if (!content) return;
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", prop);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }
  function ensureCanonical(href) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }

  // ---------- APPLY ----------
  if (data.title && document.title.trim() !== data.title) document.title = data.title;
  ensureCanonical(canonicalUrl);

  // Basic
  ensureMetaName("description", data.desc);
  ensureMetaName("color-scheme", "light dark"); // just in case

  // Open Graph
  ensureMetaProp("og:title", data.title);
  ensureMetaProp("og:description", data.desc);
  ensureMetaProp("og:url", canonicalUrl);
  ensureMetaProp("og:type", "website");
  ensureMetaProp("og:image", OG_IMAGE);

  // Twitter
  ensureMetaName("twitter:card", "summary_large_image");
  ensureMetaName("twitter:title", data.title);
  ensureMetaName("twitter:description", data.desc);
  ensureMetaName("twitter:image", OG_IMAGE);

  // ---------- JSON-LD (Website) ----------
  (function addLd(){
    try{
      const ld = {
        "@context":"https://schema.org",
        "@type":"WebSite",
        "name":"PDF & Image Tools",
        "url": ORIGIN,
        "inLanguage":"en",
        "potentialAction":{
          "@type":"SearchAction",
          "target": ORIGIN + "/?q={search_term_string}",
          "query-input":"required name=search_term_string"
        }
      };
      const s=document.createElement("script");
      s.type="application/ld+json";
      s.textContent=JSON.stringify(ld);
      document.head.appendChild(s);
    }catch(e){}
  })();
})();
