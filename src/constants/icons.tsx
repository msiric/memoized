import { BiLogoTypescript, BiWorld } from 'react-icons/bi'
import { CiViewTable } from 'react-icons/ci'
import { GiBallPyramid } from 'react-icons/gi'
import { GoNumber } from 'react-icons/go'
import { HiMiniQueueList } from 'react-icons/hi2'
import { LiaSitemapSolid } from 'react-icons/lia'
import {
  MdDataArray,
  MdDataObject,
  MdDataset,
  MdOutlineAccountTree,
  MdStackedBarChart,
} from 'react-icons/md'
import { PiGraph, PiPathBold } from 'react-icons/pi'
import {
  RiJavascriptFill,
  RiMindMap,
  RiStackFill,
  RiTerminalBoxLine,
} from 'react-icons/ri'
import { RxSwitch } from 'react-icons/rx'
import { TbBinaryTree, TbBrandCitymapper, TbQuotes } from 'react-icons/tb'

export const SECTION_ICONS = {
  builtInDataStructuresIcon: (
    <MdDataObject size={60} className="fill-lime-500" />
  ),
  userDefinedDataStructuresIcon: (
    <MdOutlineAccountTree size={60} className="fill-lime-500" />
  ),
  commonTechniquesIcon: (
    <MdStackedBarChart size={60} className="fill-lime-500" />
  ),
  advancedTopicsIcon: <PiPathBold size={60} className="fill-lime-500" />,
  browserAndWebAPIsIcon: <BiWorld size={60} className="fill-lime-500" />,
  javascriptMechanicsIcon: (
    <RiJavascriptFill size={60} className="fill-lime-500" />
  ),
  typescriptAdvancedIcon: (
    <BiLogoTypescript size={60} className="fill-lime-500" />
  ),
  modernFrontendIcon: <RiTerminalBoxLine size={60} className="fill-lime-500" />,
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
