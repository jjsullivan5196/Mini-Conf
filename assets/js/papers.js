let allPapers = [];
const allKeys = {
    authors: [],
    keywords: [],
    session: [],
    titles: [],
}
const filters = {
    authors: null,
    keywords: null,
    session: null,
    title: null,
};

let render_mode = 'compact';
let cards_shown = new Set();

const persistor = new Persistor('Mini-Conf-Papers');

const updateCards = (papers) => {
    const storedPapers = persistor.getAll();
    papers.forEach(
      openreview => {
          openreview.content.read = storedPapers[openreview.id] || false
      })

    const readCard = (iid, new_value) => {
        persistor.set(iid, new_value);
        // storedPapers[iid] = new_value ? 1 : null;
        // Cookies.set('papers-selected', storedPapers, {expires: 365});
    }

    const all_mounted_cards = d3.select('.cards')
      .selectAll('.myCard', openreview => openreview.id)
      .data(papers, d => d.number)
      .join('div')
      .attr('class', d => `myCard track_${d.content.track} col-xs-6 col-md-6`)
      .classed('d-none', d => !cards_shown.has(d.content.track))
      .html(card_html)

    all_mounted_cards.select('.card-title')
      .on('click', function (d) {
          const iid = d.id;
          all_mounted_cards.filter(d => d.id === iid)
            .select(".checkbox-paper").classed('selected', function () {
              const new_value = true;//!d3.select(this).classed('not-selected');
              readCard(iid, new_value);
              return new_value;
          })
      })

    all_mounted_cards.select(".checkbox-paper")
      .on('click', function (d) {
          const iid = d.id;
          const new_value = !d3.select(this).classed('selected');
          readCard(iid, new_value);
          d3.select(this).classed('selected', new_value)
      })


    all_mounted_cards.select('.cards-img-container').each(function(d) {
        if(d.content.short_talk) {
            const overlay = videoOverlay(d.content.short_talk.split('?v=').pop());

            d3.select(this)
                .append('img')
                .classed("lazy-load-img cards_img", true)
                .attr('data-src', overlay.thumb)
                .on('click', overlay.open);
        }
        if(d.content.long_talk) {
            const overlay = videoOverlay(d.content.long_talk.split('?v=').pop());

            d3.select(this)
                .append('img')
                .classed("lazy-load-img cards_img", true)
                .attr('data-src', overlay.thumb)
                .on('click', overlay.open);
        }
        if(!d.content.short_talk && !d.content.long_talk) {
            d3.select(this)
                .append('img')
                .classed("lazy-load-img cards_img", true)
                .attr('data-src', d.content.gallery_picture);
        }
    })

    lazyLoader();
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

const render = () => {
    const f_test = [];

    updateSession();

    Object.keys(filters)
      .forEach(k => {filters[k] ? f_test.push([k, filters[k]]) : null})

    // console.log(f_test, filters, "--- f_test, filters");
    if (f_test.length === 0) updateCards(allPapers)
    else {
        const fList = allPapers.filter(
          d => {

              let i = 0, pass_test = true;
              while (i < f_test.length && pass_test) {
                  if (f_test[i][0] === 'titles') {
                      pass_test &= d.content['title'].toLowerCase()
                        .indexOf(f_test[i][1].toLowerCase()) > -1;

                  } else {
                      pass_test &= d.content[f_test[i][0]].indexOf(
                        f_test[i][1]) > -1
                  }
                  i++;
              }
              return pass_test;
          });
        // console.log(fList, "--- fList");
        updateCards(fList)
    }

}

const updateFilterSelectionBtn = value => {
    d3.selectAll('.filter_option label')
      .classed('active', function () {
          const v = d3.select(this).select('input').property('value')
          return v === value;
      })
}

const updateSession = () => {
    const urlSession = getUrlParameter("session");
    if (urlSession) {
        filters['session'] = urlSession
        d3.select('#session_name').text(urlSession);
        d3.select('.session_notice').classed('d-none', null);
        return true;
    } else {
        filters['session'] = null
        return false;
    }
}

function trackSelect(card_tracks) {
    const buttons = d3.select('.select_tracks');
    card_tracks.forEach(track => {
        buttons.insert('button')
            .text(track)
            .classed('btn btn-outline-secondary active', true)
            .attr('data-tippy-content', `Toggle ${track} track in gallery`)
            .on('click', function() {
                const selected = !cards_shown.delete(track);

                if(selected) {
                    cards_shown.add(track);
                }

                d3.select(this).classed('active', selected);
                d3.selectAll(`.track_${track}`).classed('d-none', !selected);
            })
    })
}

/**
 * START here and load JSON.
 */
const start = (layout) => {
    const urlFilter = getUrlParameter("filter") || 'titles';
    setQueryStringParameter("filter", urlFilter);
    updateFilterSelectionBtn(urlFilter)


    d3.json('papers.json').then(papers => {
        console.log(papers, "--- papers");

        papers.forEach(p => cards_shown.add(p.content.track));
        trackSelect(cards_shown);
        layout();

        shuffleArray(papers);

        allPapers = papers;
        calcAllKeys(allPapers, allKeys);
        setTypeAhead(urlFilter,
          allKeys, filters, render);
        updateCards(allPapers)


        const urlSearch = getUrlParameter("search");
        if ((urlSearch !== '') || updateSession()) {
            filters[urlFilter] = urlSearch;
            $('.typeahead_all').val(urlSearch);
            render();
        }


    }).catch(e => console.error(e))
}


/**
 * EVENTS
 * **/

d3.selectAll('.filter_option input').on('click', function () {
    const me = d3.select(this)

    const filter_mode = me.property('value');
    setQueryStringParameter("filter", filter_mode);
    setQueryStringParameter("search", '');
    updateFilterSelectionBtn(filter_mode);


    setTypeAhead(filter_mode, allKeys, filters, render);
    render();
})

d3.selectAll('.remove_session').on('click', () => {
    setQueryStringParameter("session", '');
    render();

})

d3.selectAll('.render_option input').on('click', function () {
    const me = d3.select(this);
    render_mode = me.property('value');

    render();
})

d3.select('.reshuffle').on('click', () => {
    shuffleArray(allPapers);

    render();
})

/**
 * CARDS
 */

const keyword = kw => `<a href="papers.html?filter=keywords&search=${kw}"
                       class="text-secondary text-decoration-none">${kw.toLowerCase()}</a>`

const card_image = (openreview, show) => {
    if (show) return ` <center><img class="lazy-load-img cards_img" data-src="https://iclr.github.io/iclr-images/small/${openreview.id}.jpg" width="80%"/></center>`
    else return ''
}

const card_detail = (openreview, show) => {
    if (show)
        return ` 
     <div class="pp-card-header pp-card-detail">
        <p class="card-text"> ${openreview.content.TLDR}</p>
        <p class="card-text"><span class="font-weight-bold">Keywords:</span>
            ${openreview.content.keywords.map(keyword).join(', ')}
        </p>
    </div>
`
    else return ''
}

const card_links = ({ content }) => {
    let links = [];

    content.project_website && links.push(`<a href="${content.project_website}">Project Website</a>`);
    content.lab_website && links.push(`<a href="${content.lab_website}">Lab Website</a>`);
    content.source_code && links.push(`<a href="${content.source_code}">Source Code</a>`);

    return links.length > 0 ? `
    <h6 class="card-subtitle card-links text-muted">
        ${links.join(' | ')}
    </h6>` : '';
}

const card_attend = ({ content }) => {
    let links = [];

    content.broadcast && links.push(`<a class="btn btn-sm btn-primary rounded-0" role="button" href="${content.broadcast}">Attend Live</a>`);
    content.qa && links.push(`<a class="btn btn-sm btn-secondary rounded-0" role="button" href="${content.qa}">Q&amp;A</a>`);

    return links.length > 0 ? links.join('') : '';
}

const card_time_small = (openreview, show) => {
    const cnt = openreview.content;
    return show ? `
<!--    <div class="pp-card-footer">-->
    <div class="text-center" style="margin-top: 10px;">
    ${cnt.session.filter(s => s.match(/.*[0-9]/g)).map(
      (s, i) => `<a class="card-subtitle text-muted" href="?session=${encodeURIComponent(
        s)}">${s.replace('Session ', '')}</a> ${card_live(
        cnt.session_links[i])} ${card_cal(openreview, i)} `).join(', ')}
    </div>
<!--    </div>-->
    ` : '';
}

const card_icon_video = icon_video(16);
const card_icon_cal = icon_cal(16);

const card_live = (link) => `<a class="text-muted" href="${link}">${card_icon_video}</a>`
const card_cal = (openreview, i) => `<a class="text-muted" href="webcal://iclr.github.io/iclr-images/calendars/poster_${openreview.forum}.${i}.ics">${card_icon_cal}</a>`

// const card_time_detail = (openreview, show) => {
//     const cnt = openreview.content;
//     return show ? `
// <!--    <div class="pp-card-footer">-->
//     <div class="text-center text-monospace small" style="margin-top: 10px;">
//     ${cnt.session.filter(s => s.match(/.*[0-9]/g))
//       .map((s, i) => `${s} ${cnt.session_times[i]} ${card_live(cnt.session_links[i])}   `)
//       .join('<br>')}
//     </div>
// <!--    </div>-->
//     ` : '';
// }

//language=HTML
const card_html = openreview => `
        <div class="pp-card pp-mode-` + render_mode + ` ">
            <div class="pp-card-header">
            <div class="checkbox-paper ${openreview.content.read ? 'selected' : ''}" style="display: block;position: absolute; top:3px;right: 35px;">٭</div>
                <span class="card-title text-muted">
                    <h5>${openreview.content.track.toUpperCase()} #${openreview.sequence}: ${card_attend(openreview)}</h5>
                </span>
                <span target="_blank" class="text-muted">
                   <h5 class="card-title" align="center"> ${openreview.content.title} </h5>
                </span>
                <h6 class="card-subtitle text-muted" align="center">
                        ${openreview.content.authors.join(', ')}<br/>
                        ${openreview.content.affiliations.join(' | ')}
                </h6>
                ${render_mode !== 'list' ? '<div class="cards-img-container"></div>' : ''}
                ${card_links(openreview)}
                
            </div>
               
                ${card_detail(openreview, (render_mode === 'detail'))}
        </div>`

