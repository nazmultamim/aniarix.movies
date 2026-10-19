const BASE_URL = "https://www.aniarix.site";

export default function sitemap() {
  const lastModified = new Date();

  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/home`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    { url: `${BASE_URL}/movies`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/tv`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/popular`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/top-rated`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/upcoming`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/genres`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    {
      url: `${BASE_URL}/trending`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
