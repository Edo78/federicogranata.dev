const fontStylesheet = document.querySelector("[data-font-stylesheet]");
if (fontStylesheet) fontStylesheet.setAttribute("rel", "stylesheet");

const mobileNav = document.querySelector("[data-mobile-nav]");
const menuToggle = mobileNav?.querySelector("summary");

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !mobileNav?.open) return;
  mobileNav.removeAttribute("open");
  menuToggle?.focus();
});

document.addEventListener("click", (event) => {
  if (!mobileNav?.open || mobileNav.contains(event.target)) return;
  mobileNav.removeAttribute("open");
});

window.matchMedia("(min-width: 1024px)").addEventListener("change", (event) => {
  if (event.matches) mobileNav?.removeAttribute("open");
});
