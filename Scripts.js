document.addEventListener('DOMContentLoaded', function () {


  const toggleBtn = document.getElementById('themeToggle');

  const htmlEl = document.documentElement;

  const savedTheme = localStorage.getItem('theme') || 'light';

  htmlEl.dataset.theme = savedTheme;

  toggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  toggleBtn.addEventListener('click', function () {

    const currentTheme = htmlEl.dataset.theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    htmlEl.dataset.theme = nextTheme;

    toggleBtn.textContent = nextTheme === 'dark' ? '☀️' : '🌙';

    localStorage.setItem('theme', nextTheme);
  });


  const hamburgerBtn = document.getElementById('hamburger');
  const mobileMenuEl = document.getElementById('mobileMenu');

  hamburgerBtn.addEventListener('click', function () {

    mobileMenuEl.classList.toggle('open');

    const lines = hamburgerBtn.querySelectorAll('span');

    if (mobileMenuEl.classList.contains('open')) {
      lines[0].style.transform = 'rotate(45deg) translate(4px, 4px)';  // Garis atas miring kanan
      lines[1].style.opacity   = '0';                                    // Garis tengah menghilang
      lines[2].style.transform = 'rotate(-45deg) translate(4px, -4px)'; // Garis bawah miring kiri
    } else {      lines.forEach(function (line) {
        line.style.transform = '';
        line.style.opacity   = '';
      });
    }
  });

  window.closeMobileMenu = function () {
    mobileMenuEl.classList.remove('open');

    const lines = hamburgerBtn.querySelectorAll('span');
    lines.forEach(function (line) {
      line.style.transform = '';
      line.style.opacity   = '';
    });
  };

  const revealObserver = new IntersectionObserver(function (entries) {

    entries.forEach(function (entry) {

      if (entry.isIntersecting) {

        entry.target.classList.add('visible');

        entry.target.querySelectorAll('.skill-fill').forEach(function (bar) {
          bar.style.width = bar.dataset.pct + '%';
        });

        revealObserver.unobserve(entry.target);
      }
    });

  }, {
    threshold: 0.12 // Trigger saat 12% elemen sudah terlihat di layar
  });

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });


  document.querySelectorAll('.skill-card').forEach(function (card) {

    const bar = card.querySelector('.skill-fill');

    // Jika tidak ada progress bar, skip ke kartu berikutnya
    if (!bar) return;

    const skillObserver = new IntersectionObserver(function (entries) {

      if (entries[0].isIntersecting) {

        bar.style.width = bar.dataset.pct + '%';

        skillObserver.unobserve(card);
      }

    }, {
      threshold: 0.3 // Trigger saat 30% kartu terlihat (lebih dari observer umum)
    });

    skillObserver.observe(card);
  });


  const allSections = document.querySelectorAll('section[id]');

  const allNavLinks = document.querySelectorAll('.nav-links a');

  const sectionObserver = new IntersectionObserver(function (entries) {

    entries.forEach(function (entry) {

      if (entry.isIntersecting) {

        allNavLinks.forEach(function (link) {

          const isActive = link.getAttribute('href') === '#' + entry.target.id;

          // toggle(class, kondisi): tambahkan jika kondisi true, hapus jika false
          link.classList.toggle('active', isActive);
        });
      }
    });

  }, {
    rootMargin: '-40% 0px -55% 0px'
  });

  allSections.forEach(function (section) {
    sectionObserver.observe(section);
  });


  document.querySelectorAll('.btn-doc').forEach(function (btn) {

    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'translateY(-1px)'; // Naik 1px
    });

    btn.addEventListener('mouseleave', function () {
      btn.style.transform = ''; // Kembali ke posisi normal
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {

    anchor.addEventListener('click', function (e) {

      const targetId = this.getAttribute('href');

      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);

      if (targetEl) {
        e.preventDefault();

        const navHeight = document.getElementById('navbar').offsetHeight;
        const targetTop = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight;

        window.scrollTo({
          top: targetTop,
          behavior: 'smooth' // Animasi scroll mulus
        });
      }
    });
  });

}); 