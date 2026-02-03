export const initNavigation = () => {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.admin-section');

  const activateSection = (sectionId) => {
    navItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });
    sections.forEach((section) => {
      section.classList.toggle('active', section.id === sectionId);
    });
  };

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      activateSection(item.dataset.section);
    });
  });

  if (navItems.length > 0) {
    activateSection(navItems[0].dataset.section);
  }
};
