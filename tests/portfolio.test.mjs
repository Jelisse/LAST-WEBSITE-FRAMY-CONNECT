import test from 'node:test';
import assert from 'node:assert/strict';
import { blankProfile, validateProfile, publicProfile } from '../lib/domain.ts';
import {
  profileLanguages,
  emptyProfileTranslation,
  profileInLanguage,
} from '../lib/profile-locales.ts';
import {
  profileColors,
  profileTheme,
  defaultBusiness,
} from '../lib/profile-business.ts';
import { defaultExtras } from '../lib/profile-growth.ts';
import { profilePresentation } from '../lib/entitlement.ts';
const base = () => ({
  ...blankProfile,
  name: 'Ana Matavele',
  username: 'ana_matavele',
  title: 'Designer',
  bio: 'Original biography',
  contentLanguage: 'en',
  business: { ...defaultBusiness, hours: 'Weekdays', address: 'Maputo' },
  links: [{ label: 'My work', url: 'https://example.com/work' }],
});
test('portfolio translations preserve identity, contact privacy and destinations in every language', () => {
  const original = base();
  original.email = 'private@example.com';
  original.translations = Object.fromEntries(
    profileLanguages.map((locale) => [
      locale,
      {
        ...emptyProfileTranslation(),
        title: `Title ${locale}`,
        bio: `Bio ${locale}`,
        hours: `Hours ${locale}`,
        address: 'Maputo',
        links: [{ url: original.links[0].url, label: `Work ${locale}` }],
      },
    ]),
  );
  const saved = validateProfile(original);
  for (const locale of profileLanguages) {
    const { profile, missing } = profileInLanguage(
      publicProfile(saved),
      locale,
    );
    assert.equal(profile.name, original.name);
    assert.equal(profile.username, original.username);
    assert.equal(profile.title, `Title ${locale}`);
    assert.equal(profile.bio, `Bio ${locale}`);
    assert.equal(profile.links[0].label, `Work ${locale}`);
    assert.equal(profile.links[0].url, original.links[0].url);
    assert.equal(profile.email, '');
    assert.equal(missing, false);
  }
});
test('missing translations honestly retain original text and old English versions remain usable', () => {
  const original = base();
  original.contentLanguage = 'pt-MZ';
  original.extras = {
    ...defaultExtras,
    english: { title: 'Legacy English title', bio: '', hours: '' },
  };
  const english = profileInLanguage(original, 'en');
  assert.equal(english.profile.title, 'Legacy English title');
  assert.equal(english.profile.bio, original.bio);
  assert.equal(english.missing, true);
  assert.equal(profileInLanguage(original, 'pt-MZ').missing, false);
  assert.equal(profileInLanguage(original, 'zh-Hant').missing, true);
});
test('cover assets and translations reject unsafe input and preserve old portrait settings', () => {
  const coverUrl = '/api/profile-photo/11111111-1111-4111-8111-111111111111';
  const saved = validateProfile({
    ...base(),
    coverUrl,
    coverPosition: 70,
    photoShape: 'circle',
    photoPattern: 'waves',
  });
  assert.equal(saved.coverUrl, coverUrl);
  assert.equal(saved.coverPosition, 70);
  assert.equal(saved.photoPattern, 'waves');
  for (const input of [
    { coverUrl: 'https://example.com/private' },
    { coverPosition: 101 },
    { contentLanguage: 'invalid' },
    { translations: [] },
    { translations: { en: { bio: 'x'.repeat(1201) } } },
    { translations: { 'zh-Hant': { links: 'invalid' } } },
  ])
    assert.throws(() => validateProfile({ ...base(), ...input }));
});
test('translated content obeys publication limits and never resurrects restricted fields', () => {
  const original = base();
  original.links.push({ label: 'Hidden', url: 'https://example.com/hidden' });
  original.translations = {
    en: {
      ...emptyProfileTranslation(),
      bio: 'x'.repeat(400),
      address: 'Secret translated address',
      links: original.links.map((l) => ({ ...l })),
      services: [{ title: 'Restricted service', description: '', price: '' }],
    },
  };
  const member = {
    plan_id: 'personal',
    terms_json: JSON.stringify({
      id: 'personal',
      links: 1,
      bio: 100,
      entitlementVersion: 1,
    }),
  };
  const published = profilePresentation(original, 'paid', member);
  assert.equal(published.translations.en.bio.length, 100);
  assert.equal(published.translations.en.address, '');
  assert.equal(published.translations.en.links.length, 1);
  assert.equal(published.translations.en.services.length, 0);
  const basic = profilePresentation(original, 'basic', member);
  assert.equal(basic.translations, undefined);
  assert.equal(profileInLanguage(basic, 'en').profile.bio, '');
});
function luminance(hex) {
  return [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
}
test('all eight curated themes meet AA contrast for body text, secondary text and accents', () => {
  assert.equal(profileColors.length, 8);
  for (const color of profileColors) {
    const theme = profileTheme(color.value);
    for (const foreground of [theme.ink, theme.muted, theme.accent]) {
      const [light, dark] = [luminance(foreground), luminance(theme.hex)].sort(
        (a, b) => b - a,
      );
      assert.ok(
        (light + 0.05) / (dark + 0.05) >= 4.5,
        `${color.value}: ${foreground}`,
      );
    }
  }
});

test('profile web addresses normalize without losing translations, privacy selections or preferred contact', () => {
 const original = base();
 original.website = '  www.example.com/work?from=profile#about  ';
 original.links = [{ label: 'Work', url: 'example.org/portfolio' }];
 original.extras = { ...defaultExtras, visibleLinks: ['example.org/portfolio'], primaryContact: 'example.org/portfolio', services: [{title:'Consultation',description:'Details',price:'Ask',url:'example.net/book'}] };
 original.translations = { fr: { ...emptyProfileTranslation(), links: [{url:'example.org/portfolio',label:'Portfolio'}] } };
 const saved = validateProfile(original);
 assert.equal(saved.website, 'https://www.example.com/work?from=profile#about');
 assert.equal(saved.links[0].url,'https://example.org/portfolio');
 assert.deepEqual(saved.extras.visibleLinks,['https://example.org/portfolio']);
 assert.equal(saved.extras.primaryContact,saved.links[0].url);
 assert.equal(saved.extras.services[0].url,'https://example.net/book');
 assert.equal(profileInLanguage(saved,'fr').profile.links[0].label,'Portfolio');
 for (const bad of ['not a website','@someone','javascript:alert(1)','data:text/html,test','http://example.com','//example.com','https://user:secret@example.com','https://example.com\\evil','https://exa\nmple.com']) {
   assert.throws(()=>validateProfile({...base(),website:bad}),/Website ou portefólio/);
 }
 for (const bad of ['javascript:alert(1)','http://example.com','https://user:secret@example.com','https://example.com\\evil','https://exa\nmple.com']) {
  assert.throws(()=>validateProfile({...base(),links:[{label:'Unsafe',url:bad}]}));
  assert.throws(()=>validateProfile({...base(),extras:{...defaultExtras,services:[{title:'Offer',description:'',price:'',url:bad}]}}));
 }
 assert.equal(validateProfile({...base(),website:''}).website,'');
 assert.equal(validateProfile({...base(),website:'https://例子.中国/作品'}).website,new URL('https://例子.中国/作品').href);
 assert.equal(validateProfile({...base(),website:'例子.中国/作品'}).website,new URL('https://例子.中国/作品').href);
 assert.throws(()=>validateProfile({...base(),website:'example.com/'+'x'.repeat(288)}),/Website ou portefólio/);
});
