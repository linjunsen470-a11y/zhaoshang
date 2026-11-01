#!/usr/bin/env python3
"""Clean only this project's SHA tags. Defaults to a read-only preview."""
import argparse
import datetime
import json
import os
import re
from pathlib import Path

REPOSITORIES = ('jinyi_zhaoshang/wechat_app', 'jinyi_zhaoshang/wechat_app-tools')
SHA = re.compile(r'^[a-f0-9]{40}$')


def candidates(tags, protected):
    releases = [tag for tag in tags if SHA.fullmatch(tag['TagName'])]
    def pushed(tag):
        # Tencent returns e.g. 2019-10-24 14:20:51 +0800 CST.
        value = tag['PushTime']
        return datetime.datetime.strptime(' '.join(value.split()[:3]), '%Y-%m-%d %H:%M:%S %z')
    releases.sort(key=pushed, reverse=True)
    keep = protected | {tag['TagName'] for tag in releases[:5]}
    # Protect other tags pointing at the same digest as a retained tag.
    digests = {tag['TagId'] for tag in tags if tag['TagName'] in keep or not SHA.fullmatch(tag['TagName'])}
    return [tag['TagName'] for tag in releases if tag['TagName'] not in keep and tag['TagId'] not in digests]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    from tencentcloud.common import credential
    from tencentcloud.tcr.v20190924 import tcr_client, models
    client = tcr_client.TcrClient(credential.Credential(
        os.environ['TENCENTCLOUD_SECRET_ID'], os.environ['TENCENTCLOUD_SECRET_KEY']),
        os.environ['TENCENTCLOUD_REGION'])
    protected = set()
    for name in ('deployed-revision', 'previous-deployed-revision'):
        path = Path(name)
        if path.exists():
            value = path.read_text().strip()
            if not SHA.fullmatch(value):
                raise ValueError('Invalid protected deployment revision')
            protected.add(value)
    if not protected or not Path('deployed-revision').exists():
        raise ValueError('Cannot clean without deployed-revision')
    for repo in REPOSITORIES:
        tags = []
        while True:
            request = models.DescribeImagePersonalRequest()
            request.from_json_string(json.dumps({'RepoName': repo, 'Offset': len(tags), 'Limit': 100}))
            data = json.loads(client.DescribeImagePersonal(request).to_json_string())['Data']
            page = data['TagInfo']
            tags.extend(page)
            if len(tags) >= data['TagCount']:
                break
            if not page:
                raise RuntimeError('Incomplete tag listing; refusing cleanup')
        remove = candidates(tags, protected)
        print(json.dumps({'repository': repo, 'before': len(tags), 'delete': remove, 'apply': args.apply}), flush=True)
        for tag in remove:
            if args.apply:
                request = models.DeleteImagePersonalRequest()
                request.from_json_string(json.dumps({'RepoName': repo, 'Tag': tag}))
                client.DeleteImagePersonal(request)
                print('Deleted ' + repo + ':' + tag, flush=True)


if __name__ == '__main__':
    main()
