// ─── srd.js — Re-export facade ─────────────────────────────────────────────
// This file re-exports from the split modules so that all existing consumer
// imports (`from './srd'`, `from '../data/srd'`) keep working unchanged.
// The actual logic now lives in:
//   characterRules.js, adventureParser.js, sceneState.js,
//   knowledgeModel.js, adventureContext.js

// ── Character Rules ─────────────────────────────────────────────────────────
export {
  PROJECT_NAME,
  SRD_VERSION_LABEL,
  ATTR_LABELS,
  ATTR_SHORT_LABELS,
  RACE_CONFIG,
  RACES,
  applyRacialBonuses,
  SKILLS,
  CLASS_SKILL_OPTIONS,
  calcSkillBonus,
  resolveSkillCheck,
  CLASSES,
  CLASS_CONFIG,
  CLASS_WEAPON_DEFAULTS,
  getClassWeaponDefaults,
  CLASS_ARMOR_OPTIONS,
  getDefaultArmorBonus,
  ABILITY_SAVE_LABELS,
  legacyClassNameToCurrent,
  hasSpellcasting,
  getAbilityModifier,
  roll4d6DropLowest,
  getProficiencyBonus,
  calcHitPoints,
  calcArmorClass,
  calcInitiativeBonus,
  calcAttackBonus,
  calcSpellSaveDC,
  calcSpellAttackBonus,
  isStructuredInventory,
  migrateInventory,
  migrateStarterInventory,
  getEquippedItem,
  deriveArmorBonusFromEquipment,
  calcArmorClassFromEquipment,
  createCharacterTemplate,
  recalcCharacterStats,
  normalizeCharacter,
  XP_THRESHOLDS,
  getLevelFromXP,
  getXPForNextLevel,
  CR_XP,
  ENEMY_PRESETS,
} from './characterRules'

// ── Spell System (via characterRules → spells.js) ───────────────────────────
export {
  SPELL_LIST,
  CASTER_PROGRESSION,
  SPELL_SLOTS,
  getClassSpells,
  getSpellSlots,
  getCantripsKnownCount,
  getSpellsKnownCount,
  getMaxSpellLevel,
} from './characterRules'

// ── Rules (via characterRules → rules.js) ───────────────────────────────────
export {
  SRD_QUICK_RULES,
  SRD_CORE_PROMPT_RULES,
  SRD_RULE_BLOCKS,
  resolveRelevantRuleBlockKeys,
  buildRelevantRulesContext,
} from './characterRules'

// ── Items (via characterRules → items.js) ───────────────────────────────────
export {
  ITEM_CATALOG,
  EMPTY_CURRENCY,
  lookupItem,
  createInventoryItem,
  generateInventoryId,
  CURRENCY_CONFIG,
  CURRENCY_ORDER,
  calcCarryingCapacity,
  calcTotalWeight,
  calcTotalGoldValue,
  getItemsByType,
  getWeapons,
  getArmors,
  getArmorsForClass,
  canUseShield,
  ITEM_TYPES,
  ARMOR_PROFICIENCY,
  SHIELD_PROFICIENCY,
} from './characterRules'

// ── Adventure Parsing ───────────────────────────────────────────────────────
export {
  normalizeAdventureEntry,
  prepareAdventureForStorage,
} from './adventureParser'

// ── Scene State ─────────────────────────────────────────────────────────────
export {
  findSectionById,
  selectRelevantChunks,
  createInitialSceneState,
  deriveSceneState,
  resolveReveals,
  applyReveals,
  findInteractionDef,
  applyInteractionOutcome,
  applyInteractionSuccess,
  resolveInteractionOutcome,
} from './sceneState'

// ── Adventure Context ───────────────────────────────────────────────────────
export {
  buildRelevantAdventureContext,
} from './adventureContext'
