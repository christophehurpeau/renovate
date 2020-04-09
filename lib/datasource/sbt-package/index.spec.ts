import path from 'path';
import fs from 'fs';
import nock from 'nock';
import { getPkgReleases } from '..';
import { MAVEN_REPO } from '../maven/common';
import { parseIndexDir } from '../sbt-plugin/util';
import * as sbtPlugin from '.';
import * as mavenVersioning from '../../versioning/maven';

const mavenIndexHtml = fs.readFileSync(
  path.resolve(__dirname, `./__fixtures__/maven-index.html`),
  'utf8'
);

const sbtPluginIndex = fs.readFileSync(
  path.resolve(__dirname, `./__fixtures__/sbt-plugins-index.html`),
  'utf8'
);

describe('datasource/sbt', () => {
  it('parses Maven index directory', () => {
    expect(parseIndexDir(mavenIndexHtml)).toMatchSnapshot();
  });
  it('parses sbt index directory', () => {
    expect(parseIndexDir(sbtPluginIndex)).toMatchSnapshot();
  });

  describe('getPkgReleases', () => {
    beforeEach(() => {
      nock.disableNetConnect();
      nock('https://failed_repo')
        .get('/maven/org/scalatest/')
        .reply(404, null);
      nock('https://repo.maven.apache.org')
        .get('/maven2/org/scalatest/')
        .reply(
          200,
          '<a href="scalatest/" title=\'scalatest/\'>scalatest_2.12/</a>\n' +
            '<a href="scalatest_2.12/" title=\'scalatest_2.12/\'>scalatest_2.12/</a>\n' +
            "<a href='scalatest_sjs2.12/'>scalatest_2.12/</a>" +
            "<a href='scalatest_native2.12/'>scalatest_2.12/</a>"
        );
      nock('https://repo.maven.apache.org')
        .get('/maven2/org/scalatest/scalatest/')
        .reply(200, "<a href='1.2.0/'>1.2.0/</a>");
      nock('https://repo.maven.apache.org')
        .get('/maven2/org/scalatest/scalatest_2.12/')
        .reply(200, "<a href='1.2.3/'>4.5.6/</a>");

      nock('https://dl.bintray.com')
        .get('/sbt/sbt-plugin-releases/com.github.gseitz/')
        .reply(200, '');
      nock('https://dl.bintray.com')
        .get('/sbt/sbt-plugin-releases/org.foundweekends/sbt-bintray/')
        .reply(
          200,
          '<html>\n' +
            '<head>\n' +
            '</head>\n' +
            '<body>\n' +
            '<pre><a href="scala_2.12/">scala_2.12/</a></pre>\n' +
            '</body>\n' +
            '</html>'
        );
      nock('https://dl.bintray.com')
        .get(
          '/sbt/sbt-plugin-releases/org.foundweekends/sbt-bintray/scala_2.12/'
        )
        .reply(
          200,
          '\n' +
            '<html>\n' +
            '<head>\n' +
            '</head>\n' +
            '<body>\n' +
            '<pre><a href="sbt_1.0/">sbt_1.0/</a></pre>\n' +
            '</body>\n' +
            '</html>\n'
        );
      nock('https://dl.bintray.com')
        .get(
          '/sbt/sbt-plugin-releases/org.foundweekends/sbt-bintray/scala_2.12/sbt_1.0/'
        )
        .reply(
          200,
          '\n' +
            '<html>\n' +
            '<head>\n' +
            '</head>\n' +
            '<body>\n' +
            '<pre><a href="0.5.5/">0.5.5/</a></pre>\n' +
            '</body>\n' +
            '</html>\n'
        );
    });

    afterEach(() => {
      nock.enableNetConnect();
    });

    it('returns null in case of errors', async () => {
      expect(
        await getPkgReleases({
          versioning: mavenVersioning.id,
          datasource: sbtPlugin.id,
          depName: 'org.scalatest:scalatest',
          registryUrls: ['https://failed_repo/maven'],
        })
      ).toEqual(null);
    });
    it('fetches releases from Maven', async () => {
      expect(
        await getPkgReleases({
          versioning: mavenVersioning.id,
          datasource: sbtPlugin.id,
          depName: 'org.scalatest:scalatest',
          registryUrls: ['https://failed_repo/maven', MAVEN_REPO],
        })
      ).toEqual({
        dependencyUrl: 'https://repo.maven.apache.org/maven2/org/scalatest',
        display: 'org.scalatest:scalatest',
        group: 'org.scalatest',
        name: 'scalatest',
        releases: [{ version: '1.2.0' }, { version: '1.2.3' }],
      });
      expect(
        await getPkgReleases({
          versioning: mavenVersioning.id,
          datasource: sbtPlugin.id,
          depName: 'org.scalatest:scalatest_2.12',
          registryUrls: [],
        })
      ).toEqual({
        dependencyUrl: 'https://repo.maven.apache.org/maven2/org/scalatest',
        display: 'org.scalatest:scalatest_2.12',
        group: 'org.scalatest',
        name: 'scalatest_2.12',
        releases: [{ version: '1.2.3' }],
      });
    });
  });
});
