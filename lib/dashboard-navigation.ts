// A new dashboard section must not inherit a previous section's scroll position.
export function focusDashboardStart() {
  requestAnimationFrame(() => {
    window.scrollTo({top:0,behavior:'instant'});
    const heading = document.querySelector<HTMLElement>('main h1, main');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  });
}
