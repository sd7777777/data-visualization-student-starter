import {
  faCircleInfo,
  faCheck,
  faShuffle,
  faSliders,
  faArrowDown,
  faArrowRight,
  faArrowUp,
  faArrowUpRightFromSquare,
  faArrowsLeftRight,
  faChartColumn,
  faDownload,
  faMagnifyingGlass,
  faObjectGroup,
  faRotateLeft,
  faCompass,
  faLocationDot,
  faDatabase,
  faChartPie,
  faPills,
  faUserDoctor,
  faFileLines,
  faCoins,
  faListCheck,
  faShieldHalved,
  faLayerGroup,
  faBookOpen,
  faBookmark,
  faImage,
  faTrashCan,
  faPenToSquare,
  faLink,
  faFileImport,
} from '@fortawesome/free-solid-svg-icons';

const icons = {
  info: faCircleInfo,
  check: faCheck,
  shuffle: faShuffle,
  tune: faSliders,
  down: faArrowDown,
  next: faArrowRight,
  up: faArrowUp,
  external: faArrowUpRightFromSquare,
  compare: faArrowsLeftRight,
  chart: faChartColumn,
  download: faDownload,
  inspect: faMagnifyingGlass,
  group: faObjectGroup,
  reset: faRotateLeft,
  explore: faCompass,
  place: faLocationDot,
  data: faDatabase,
  share: faChartPie,
  clinical: faPills,
  providers: faUserDoctor,
  records: faFileLines,
  cost: faCoins,
  tasks: faListCheck,
  validate: faShieldHalved,
  fields: faLayerGroup,
  book: faBookOpen,
  bookmark: faBookmark,
  image: faImage,
  trash: faTrashCan,
  write: faPenToSquare,
  link: faLink,
  import: faFileImport,
};

export type FaIconName = keyof typeof icons;

/** Local FontAwesome Free SVGs: text supplies each action's accessible name. */
export function FaIcon({ name }: { name: keyof typeof icons }) {
  const [width, height, , , paths] = icons[name].icon;
  return (
    <svg
      className="fa-icon"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      {(Array.isArray(paths) ? paths : [paths]).map((path, i) => (
        <path key={i} d={path} />
      ))}
    </svg>
  );
}
