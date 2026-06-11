import fs from 'node:fs';
import path from 'node:path';

const POLICY_PATH = 'data/parser-policies/parser-policies.json';

export function loadParserPolicies(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, POLICY_PATH), 'utf8'));
}

export function getParserPolicyForPath(sourcePath, policies = loadParserPolicies()) {
  const folder = sourceFolder(sourcePath);
  return folder ? policies.folders?.[folder] ?? null : null;
}

export function sourceFolder(sourcePath) {
  const normalized = String(sourcePath ?? '').replaceAll('\\', '/');
  const parts = normalized.split('/').filter(Boolean);
  const dbIndex = parts.findIndex((part) => part.toLowerCase() === 'database');
  if (dbIndex >= 0) return parts[dbIndex + 1] ?? null;
  return parts.length > 1 ? parts[parts.length - 2] : null;
}

export function cleanSentinel(value, policies = loadParserPolicies()) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  const sentinels = policies.defaults?.sentinelValues ?? [];
  return sentinels.some((item) => item.toUpperCase() === text.toUpperCase()) ? null : text;
}

export function inferClassFromFilename(filename, policies = loadParserPolicies()) {
  const stem = String(filename ?? '').split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  const ratings = [...(policies.defaults?.classRatings ?? [])].sort((a, b) => b.length - a.length);
  return ratings.find((rating) => new RegExp(`${escapeRegex(rating)}(?=\\D|$)`).test(stem)) ?? null;
}

export function inferUnitSystemFromFilename(filename) {
  return /imperial/i.test(String(filename ?? '')) ? 'IMPERIAL' : 'METRIC';
}

export function isIgnoredColumn(policy, zeroBasedIndex) {
  const ranges = policy?.columnPolicy?.declaredIgnoredRanges ?? [];
  return ranges.some(([start, end]) => zeroBasedIndex >= start && zeroBasedIndex <= end);
}

export function requiresRowExplosion(policy) {
  return policy?.rowExplosion?.required === true;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
