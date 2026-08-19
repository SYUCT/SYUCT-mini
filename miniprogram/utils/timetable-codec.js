const PREFIX = 'SYUCT-TT2:';
const MAX_CODE_LENGTH = 200000;
const MAX_COURSES = 200;

const WEEK_TYPE_TO_CODE = {
  all: '0',
  odd: '1',
  even: '2'
};

const CODE_TO_WEEK_TYPE = {
  '0': 'all',
  '1': 'odd',
  '2': 'even'
};

function compactText(value) {
  return String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ').trim();
}

function base36Digit(value, fallback) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? Math.round(number) : fallback;
  if (safe < 0 || safe > 35) throw new Error('课表码数值超出范围');
  return safe.toString(36);
}

function packText(value) {
  const text = compactText(value);
  return `${text.length.toString(36)}:${text}`;
}

function readPackedText(source, cursor) {
  const colon = source.indexOf(':', cursor);
  if (colon < 0) throw new Error('课表码文本字段损坏');
  const lengthText = source.slice(cursor, colon);
  if (!/^[0-9a-z]+$/.test(lengthText)) throw new Error('课表码文本长度损坏');
  const length = parseInt(lengthText, 36);
  const start = colon + 1;
  const end = start + length;
  if (!Number.isFinite(length) || length < 0 || end > source.length) throw new Error('课表码文本字段不完整');
  return { value: source.slice(start, end), cursor: end };
}

function checksum(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function assertIntegerInRange(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`课表码${label}无效`);
  }
}

function validateDecodedCourse(course) {
  assertIntegerInRange(course.weekday, 1, 7, '星期');
  assertIntegerInRange(course.startSection, 1, 12, '开始节次');
  assertIntegerInRange(course.endSection, 1, 12, '结束节次');
  if (course.endSection < course.startSection) throw new Error('课表码节次范围无效');
  assertIntegerInRange(course.startWeek, 1, 30, '开始周');
  assertIntegerInRange(course.endWeek, 1, 30, '结束周');
  if (course.endWeek < course.startWeek) throw new Error('课表码周次范围无效');
  if (!Object.prototype.hasOwnProperty.call(WEEK_TYPE_TO_CODE, course.weekType)) throw new Error('课表码周次规则无效');
  assertIntegerInRange(course.colorIndex, 0, 5, '颜色');
  return course;
}

function encodeShareCode(payload) {
  const settings = payload && payload.settings ? payload.settings : {};
  const courses = payload && Array.isArray(payload.courses) ? payload.courses : [];
  if (courses.length > MAX_COURSES) throw new Error('课程数量过多，无法生成课表码');

  let body = '';
  body += packText(settings.semester || payload.semester || '');
  body += packText(settings.firstWeekDate || '');
  body += base36Digit(settings.totalWeeks || 20, 20);
  body += `${courses.length.toString(36)}:`;

  courses.forEach((course, index) => {
    body += packText(course.name || '');
    body += packText(course.teacher || '');
    body += packText(course.room || '');
    body += base36Digit(course.weekday, 1);
    body += base36Digit(course.startSection, 1);
    body += base36Digit(course.endSection, course.startSection || 1);
    body += base36Digit(course.startWeek, 1);
    body += base36Digit(course.endWeek, settings.totalWeeks || 20);
    body += WEEK_TYPE_TO_CODE[course.weekType] || '0';
    body += base36Digit(course.colorIndex, index % 6);
  });

  return `${PREFIX}${checksum(body)}:${body}`;
}

function decodeShareCode(input) {
  const text = String(input == null ? '' : input).replace(/^\uFEFF/, '').trim();
  if (!text.startsWith(PREFIX)) throw new Error('不是有效的 SYUCT 课表码');
  if (text.length > MAX_CODE_LENGTH) throw new Error('课表码过长');

  const encoded = text.slice(PREFIX.length);
  if (encoded.length < 10 || encoded.charAt(8) !== ':') throw new Error('课表码头部损坏');
  const expectedChecksum = encoded.slice(0, 8).toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(expectedChecksum)) throw new Error('课表码校验信息损坏');
  const body = encoded.slice(9);
  if (checksum(body) !== expectedChecksum) throw new Error('课表码内容不完整，请重新复制');

  let cursor = 0;
  let part = readPackedText(body, cursor);
  const semester = part.value;
  cursor = part.cursor;

  part = readPackedText(body, cursor);
  const firstWeekDate = part.value;
  cursor = part.cursor;

  if (cursor >= body.length) throw new Error('课表码设置字段不完整');
  const totalWeeks = parseInt(body.charAt(cursor), 36);
  cursor += 1;
  if (!Number.isFinite(totalWeeks) || totalWeeks < 1 || totalWeeks > 30) throw new Error('课表码学期周数无效');

  const countEnd = body.indexOf(':', cursor);
  if (countEnd < 0) throw new Error('课表码课程数量损坏');
  const countText = body.slice(cursor, countEnd);
  if (!/^[0-9a-z]+$/.test(countText)) throw new Error('课表码课程数量损坏');
  const courseCount = parseInt(countText, 36);
  if (!Number.isFinite(courseCount) || courseCount < 0 || courseCount > MAX_COURSES) throw new Error('课表码课程数量无效');
  cursor = countEnd + 1;

  const courses = [];
  for (let index = 0; index < courseCount; index += 1) {
    const namePart = readPackedText(body, cursor);
    cursor = namePart.cursor;
    const teacherPart = readPackedText(body, cursor);
    cursor = teacherPart.cursor;
    const roomPart = readPackedText(body, cursor);
    cursor = roomPart.cursor;

    if (cursor + 7 > body.length) throw new Error('课表码课程字段不完整');
    const numeric = body.slice(cursor, cursor + 7);
    cursor += 7;
    const values = numeric.split('').map((char) => parseInt(char, 36));
    if (values.some((value) => !Number.isFinite(value))) throw new Error('课表码课程数值损坏');

    const weekTypeCode = numeric.charAt(5);
    if (!Object.prototype.hasOwnProperty.call(CODE_TO_WEEK_TYPE, weekTypeCode)) throw new Error('课表码周次规则无效');
    courses.push(validateDecodedCourse({
      name: namePart.value,
      teacher: teacherPart.value,
      room: roomPart.value,
      weekday: values[0],
      startSection: values[1],
      endSection: values[2],
      startWeek: values[3],
      endWeek: values[4],
      weekType: CODE_TO_WEEK_TYPE[weekTypeCode],
      colorIndex: values[6]
    }));
  }

  if (cursor !== body.length) throw new Error('课表码末尾存在异常内容');

  return {
    format: 'syuct-timetable',
    version: 1,
    semester,
    settings: {
      semester,
      firstWeekDate,
      totalWeeks
    },
    courses
  };
}

function isShareCode(text) {
  return String(text == null ? '' : text).replace(/^\uFEFF/, '').trim().startsWith(PREFIX);
}

module.exports = {
  PREFIX,
  encodeShareCode,
  decodeShareCode,
  isShareCode
};
