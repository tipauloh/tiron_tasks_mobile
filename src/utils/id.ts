// expo-crypto is not installed in this project.
// expo-modules-core (a transitive dependency always present with expo) exports
// a uuid utility that wraps the native random UUID implementation.
import { uuid } from 'expo-modules-core';

export const generateId = (): string => uuid.v4();
export const nowISO = (): string => new Date().toISOString();
export const todayDate = (): string => new Date().toISOString().split('T')[0];
