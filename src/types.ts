/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string;
  name: string;
  notes: string;
  count: number;
  tags?: string[];
  lastCalledAt?: string;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  students: Student[];
  createdAt: string;
}

export interface CallHistoryLog {
  id: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  timestamp: string;
}
