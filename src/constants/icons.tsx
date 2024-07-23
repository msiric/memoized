import { CiViewTable } from 'react-icons/ci'
import { GiBallPyramid } from 'react-icons/gi'
import { GoNumber } from 'react-icons/go'
import { HiMiniQueueList } from 'react-icons/hi2'
import { LiaSitemapSolid } from 'react-icons/lia'
import { MdDataArray, MdDataObject, MdDataset } from 'react-icons/md'
import { PiGraph } from 'react-icons/pi'
import { RiMindMap, RiStackFill } from 'react-icons/ri'
import { RxSwitch } from 'react-icons/rx'
import { TbBinaryTree, TbBrandCitymapper, TbQuotes } from 'react-icons/tb'

export const SECTION_ICONS = {
  builtInDataStructuresIcon: (
    <svg
      viewBox="0 0 24 24"
      className="h-[60px] w-[60px] sm:h-[75px] sm:w-[75px]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient
          id="icon-gradient"
          cx={0}
          cy={0}
          r={1}
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(0 21 -21 0 20 3)"
        >
          <stop stopColor="#A3E635" />
          <stop stopColor="#84CC16" offset=".527" />
          <stop stopColor="#65A30D" offset={1} />
        </radialGradient>
      </defs>
      <path fill="none" d="M0 0h24v24H0z" />
      <path
        d="M4 7v2c0 .55-.45 1-1 1H2v4h1c.55 0 1 .45 1 1v2c0 1.65 1.35 3 3 3h3v-2H7c-.55 0-1-.45-1-1v-2c0-1.3-.84-2.42-2-2.83v-.34C5.16 11.42 6 10.3 6 9V7c0-.55.45-1 1-1h3V4H7C5.35 4 4 5.35 4 7zM21 10c-.55 0-1-.45-1-1V7c0-1.65-1.35-3-3-3h-3v2h3c.55 0 1 .45 1 1v2c0 1.3.84 2.42 2 2.83v.34c-1.16.41-2 1.52-2 2.83v2c0 .55-.45 1-1 1h-3v2h3c1.65 0 3-1.35 3-3v-2c0-.55.45-1 1-1h1v-4h-1z"
        fill="url(#icon-gradient)"
      />
    </svg>
  ),
  userDefinedDataStructuresIcon: (
    <svg
      viewBox="0 0 1024 1024"
      width="50"
      height="50"
      className="h-[60px] w-[60px] sm:h-[75px] sm:w-[75px]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="none"
    >
      <defs>
        <linearGradient id="icon-gradient2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A3E635" />
          <stop offset="50%" stopColor="#84CC16" />
          <stop offset="100%" stopColor="#65A30D" />
        </linearGradient>
      </defs>
      <path
        d="M640.6 429.8h257.1c7.9 0 14.3-6.4 14.3-14.3V158.3c0-7.9-6.4-14.3-14.3-14.3H640.6c-7.9 0-14.3 6.4-14.3 14.3v92.9H490.6c-3.9 0-7.1 3.2-7.1 7.1v221.5h-85.7v-96.5c0-7.9-6.4-14.3-14.3-14.3H126.3c-7.9 0-14.3 6.4-14.3 14.3v257.2c0 7.9 6.4 14.3 14.3 14.3h257.1c7.9 0 14.3-6.4 14.3-14.3V544h85.7v221.5c0 3.9 3.2 7.1 7.1 7.1h135.7v92.9c0 7.9 6.4 14.3 14.3 14.3h257.1c7.9 0 14.3-6.4 14.3-14.3v-257c0-7.9-6.4-14.3-14.3-14.3h-257c-7.9 0-14.3 6.4-14.3 14.3v100h-78.6v-393h78.6v100c0 7.9 6.4 14.3 14.3 14.3z m53.5-217.9h150V362h-150V211.9zM329.9 587h-150V437h150v150z m364.2 75.1h150v150.1h-150V662.1z"
        fill="url(#icon-gradient2)"
        stroke="url(#icon-gradient2)"
        strokeWidth="0"
      />
    </svg>
  ),
  commonTechniquesIcon: (
    <svg
      viewBox="0 0 24 24"
      width="50"
      height="50"
      className="h-[60px] w-[60px] sm:h-[75px] sm:w-[75px]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="icon-gradient3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A3E635" />
          <stop offset="50%" stopColor="#84CC16" />
          <stop offset="100%" stopColor="#65A30D" />
        </linearGradient>
      </defs>
      <path fill="none" d="M0 0h24v24H0z" />
      <path
        d="M4 9h4v11H4zM4 4h4v4H4zM10 7h4v4h-4zM16 10h4v4h-4zM16 15h4v5h-4zM10 12h4v8h-4z"
        fill="url(#icon-gradient3)"
        stroke="url(#icon-gradient3)"
        strokeWidth="0"
      />
    </svg>
  ),
  advancedTopicsIcon: (
    <svg
      viewBox="0 0 256 256"
      width="50"
      height="50"
      className="h-[60px] w-[60px] sm:h-[75px] sm:w-[75px]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="icon-gradient4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A3E635" />
          <stop offset="50%" stopColor="#84CC16" />
          <stop offset="100%" stopColor="#65A30D" />
        </linearGradient>
      </defs>
      <path
        d="M200,168a32.06,32.06,0,0,0-31,24H72a32,32,0,0,1,0-64h96a40,40,0,0,0,0-80H72a8,8,0,0,0,0,16h96a24,24,0,0,1,0,48H72a48,48,0,0,0,0,96h97a32,32,0,1,0,31-40Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,200,216Z"
        fill="url(#icon-gradient4)"
        stroke="url(#icon-gradient4)"
        strokeWidth="0"
      />
    </svg>
  ),
}

export const DS_ICONS = {
  strings: <TbQuotes />,
  numbers: <GoNumber />,
  arrays: <MdDataArray />,
  objects: <MdDataObject />,
  sets: <MdDataset />,
  maps: <RiMindMap />,
  primitives: <RxSwitch />,

  linkedLists: <TbBrandCitymapper />,
  stacks: <RiStackFill />,
  queues: <HiMiniQueueList />,
  hashTables: <CiViewTable />,
  heaps: <GiBallPyramid />,
  trees: <TbBinaryTree />,
  graphs: <PiGraph />,
  tries: <LiaSitemapSolid />,
}
