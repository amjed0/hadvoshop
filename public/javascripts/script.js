function addToCart(proId) {
  $.ajax({
    url: '/add-to-cart/' + proId,
    method: 'get',
    success: (response) => {
      if (response.status) {
        // Update header cart badge
        let headerBadge = $('.cart-badge');
        if (headerBadge.length) {
          let count = parseInt(headerBadge.text()) + 1;
          headerBadge.text(count);
        } else {
          // Create badge if it doesn't exist
          $('.cart-icon-link').append('<span class="cart-badge">1</span>');
        }

        // Update floating cart bar
        let floatingBar = $('#floatingCartBar');
        let countEl = $('#floatingCartCount');
        let labelEl = $('#floatingCartLabel');

        let newCount = parseInt(countEl.text() || '0') + 1;
        countEl.text(newCount);
        labelEl.text(newCount + (newCount === 1 ? ' item' : ' items'));

        // Show the bar if hidden
        if (!floatingBar.hasClass('active')) {
          floatingBar.addClass('active');
        }

        // Bounce animation
        floatingBar.removeClass('bounce');
        void floatingBar[0].offsetWidth; // force reflow
        floatingBar.addClass('bounce');

        // Badge pulse animation
        countEl.removeClass('pulse');
        void countEl[0].offsetWidth;
        countEl.addClass('pulse');

        // Brief visual feedback on the button
        let btn = $('#add-' + proId);
        let originalHtml = btn.html();
        btn.html(`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          Added
        `);
        btn.css({ background: '#2d7d46' });
        setTimeout(() => {
          btn.html(originalHtml);
          btn.css({ background: '' });
        }, 1200);
      }
    }
  });
}