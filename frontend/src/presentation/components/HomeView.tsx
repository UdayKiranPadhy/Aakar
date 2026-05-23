/**
 * HomeView — landing content rendered when `view === "home"`.
 *
 * Currently filler copy that introduces Aakar above the fold and lorem-ipsum
 * sections below to verify the main area scrolls correctly. Replace the
 * lorem-ipsum sections with real "About / Docs / Roadmap" content as the app
 * matures.
 *
 * The container is the scroll viewport: it owns `overflow-y: auto`, while the
 * outer `<main>` stays `overflow: hidden` so the page chrome doesn't move.
 */

import styles from "./HomeView.module.css";

export function HomeView() {
  return (
    <div className={styles.container}>
      <header>
        <p className={styles.eyebrow}>v0.1 · llama family</p>
        <h1 className={styles.title}>Welcome to Aakar</h1>
        <p className={styles.lead}>
          An interactive visualizer for large-language-model architectures.
          Paste any HuggingFace model ID into the search bar above, or pick a
          quick-start model from the tabs, to render its computation graph as
          a 2D diagram with three levels of zoom.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.h2}>Lorem ipsum</h2>
        <p className={styles.p}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
          ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </p>
        <p className={styles.p}>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
          officia deserunt mollit anim id est laborum. Sed ut perspiciatis
          unde omnis iste natus error sit voluptatem accusantium doloremque
          laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
          veritatis et quasi architecto beatae vitae dicta sunt explicabo.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Neque porro quisquam</h2>
        <p className={styles.p}>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
          fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem
          sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia
          dolor sit amet, consectetur, adipisci velit, sed quia non numquam
          eius modi tempora incidunt ut labore et dolore magnam aliquam
          quaerat voluptatem.
        </p>
        <p className={styles.p}>
          Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis
          suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis
          autem vel eum iure reprehenderit qui in ea voluptate velit esse quam
          nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo
          voluptas nulla pariatur?
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>At vero eos et accusamus</h2>
        <p className={styles.p}>
          At vero eos et accusamus et iusto odio dignissimos ducimus qui
          blanditiis praesentium voluptatum deleniti atque corrupti quos
          dolores et quas molestias excepturi sint occaecati cupiditate non
          provident, similique sunt in culpa qui officia deserunt mollitia
          animi, id est laborum et dolorum fuga.
        </p>
        <p className={styles.p}>
          Et harum quidem rerum facilis est et expedita distinctio. Nam libero
          tempore, cum soluta nobis est eligendi optio cumque nihil impedit
          quo minus id quod maxime placeat facere possimus, omnis voluptas
          assumenda est, omnis dolor repellendus.
        </p>
        <p className={styles.p}>
          Temporibus autem quibusdam et aut officiis debitis aut rerum
          necessitatibus saepe eveniet ut et voluptates repudiandae sint et
          molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente
          delectus, ut aut reiciendis voluptatibus maiores alias consequatur
          aut perferendis doloribus asperiores repellat.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Sed ut perspiciatis</h2>
        <p className={styles.p}>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
          quae ab illo inventore veritatis et quasi architecto beatae vitae
          dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit
          aspernatur aut odit aut fugit, sed quia consequuntur magni dolores
          eos qui ratione voluptatem sequi nesciunt.
        </p>
        <p className={styles.p}>
          Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
          consectetur, adipisci velit, sed quia non numquam eius modi tempora
          incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut
          enim ad minima veniam, quis nostrum exercitationem ullam corporis
          suscipit laboriosam.
        </p>
      </section>

      <section className={styles.sectionLast}>
        <h2 className={styles.h2}>Consectetur adipiscing</h2>
        <p className={styles.p}>
          Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse
          quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat
          quo voluptas nulla pariatur. At vero eos et accusamus et iusto odio
          dignissimos ducimus qui blanditiis praesentium voluptatum deleniti
          atque corrupti.
        </p>
        <p className={styles.p}>
          Quos dolores et quas molestias excepturi sint occaecati cupiditate
          non provident, similique sunt in culpa qui officia deserunt mollitia
          animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis
          est et expedita distinctio.
        </p>
        <p className={styles.p}>
          Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil
          impedit quo minus id quod maxime placeat facere possimus, omnis
          voluptas assumenda est, omnis dolor repellendus. Temporibus autem
          quibusdam et aut officiis debitis aut rerum necessitatibus saepe
          eveniet ut et voluptates repudiandae sint et molestiae non
          recusandae.
        </p>
      </section>
    </div>
  );
}
