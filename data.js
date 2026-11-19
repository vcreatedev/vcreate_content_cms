// Shared constants + seed data for vcreate Studio. No login: data lives in this browser (localStorage).
window.STAGES = [
  "Idea", "Planning", "Writing", "Caption", "Design", "Animation",
  "Video Editing", "Review", "Approved", "Scheduled", "Published",
];
window.PLATFORMS = ["Instagram", "Facebook", "YouTube", "LinkedIn", "WhatsApp", "Website"];
window.TYPES = ["Post", "Carousel", "Reel", "Story", "Video", "Blog", "Poster"];

(function () {
  const d = (offset) => {
    const t = new Date();
    t.setDate(t.getDate() + offset);
    return t.toISOString().slice(0, 10);
  };
  window.SEED = {
    campaigns: [
      { id: "c1", name: "Websites for Local Shops", goal: "Leads from Andhra Pradesh & Telangana small businesses", start: d(-10), end: d(20), status: "Active" },
      { id: "c2", name: "Client Wins", goal: "Show finished sites and results", start: d(-5), end: d(30), status: "Active" },
      { id: "c3", name: "Festival Offers", goal: "Seasonal offer on starter website packs", start: d(10), end: d(40), status: "Planned" },
    ],
    team: [
      { id: "t1", name: "Venkat", role: "Owner" },
      { id: "t2", name: "Designer", role: "Designer" },
      { id: "t3", name: "Editor", role: "Video Editor" },
      { id: "t4", name: "Writer", role: "Copywriter" },
    ],
    content: [
      { id: "i1", title: "Why every kirana shop needs a website", type: "Reel", platform: "Instagram", status: "Scheduled", campaign: "c1", date: d(1), owner: "t1", caption: "Customers search on Google before they visit. Be there. 📍", notes: "30s reel, Telugu voiceover" },
      { id: "i2", title: "Before/after: salon website", type: "Carousel", platform: "Instagram", status: "Design", campaign: "c2", date: d(3), owner: "t2", caption: "", notes: "5 slides, show mobile view" },
      { id: "i3", title: "What a starter website costs", type: "Post", platform: "Facebook", status: "Review", campaign: "c1", date: d(2), owner: "t4", caption: "Simple pricing, no surprises. DM us to get started.", notes: "" },
      { id: "i4", title: "How we build a site in 7 days", type: "Video", platform: "YouTube", status: "Video Editing", campaign: "c2", date: d(6), owner: "t3", caption: "", notes: "Screen recording + voiceover" },
      { id: "i5", title: "Festival starter pack offer", type: "Poster", platform: "Instagram", status: "Planning", campaign: "c3", date: d(12), owner: "t2", caption: "", notes: "Use brand colours only" },
      { id: "i6", title: "Google Business Profile checklist", type: "Blog", platform: "Website", status: "Writing", campaign: "c1", date: d(8), owner: "t4", caption: "", notes: "" },
      { id: "i7", title: "Client story: restaurant online orders", type: "Post", platform: "LinkedIn", status: "Idea", campaign: "c2", date: "", owner: "t1", caption: "", notes: "Need client approval" },
      { id: "i8", title: "3 mistakes on small business websites", type: "Reel", platform: "Instagram", status: "Published", campaign: "c1", date: d(-3), owner: "t1", caption: "Slow, not mobile-friendly, no contact button.", notes: "", stats: { views: 4200, likes: 310, shares: 42 } },
      { id: "i9", title: "Welcome message for new leads", type: "Story", platform: "WhatsApp", status: "Approved", campaign: "c1", date: d(4), owner: "t4", caption: "Thanks for reaching out to vcreate!", notes: "" },
    ],
  };
})();
