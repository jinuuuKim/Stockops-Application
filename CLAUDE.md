# CLAUDE.md — Stockops-Application

> 이 파일을 Stockops-Application 저장소 루트의 `CLAUDE.md`로 저장하세요.

## 이 저장소

메인 애플리케이션 모노레포. 아래 5개 디렉터리는 fork한 외부 레포를 **git submodule**로 구성한 것임:

- `sensimul`
- `stockops-admin-web`
- `stockops-client-web`
- `stockops-api-server`
- `stockops-ai-module`

## 자동 실행 원칙

- pull, push, submodule 동기화 작업을 할 때 사용자에게 "pull 할까요?", "push 할까요?" 같은 확인을 구하지 않는다. 요청받은 작업 범위 안이면 바로 실행한다.
- 작업 시작 시 항상 먼저 최신화한다:
  ```
  git pull --rebase
  git submodule update --init --recursive --remote
  ```
- 변경사항이 생기면 의미 단위로 커밋 후 바로 push한다. force push(`git push --force`, `-f`)는 절대 하지 않는다 — 이건 명시적으로 요청받았을 때만 예외로 한다.

## 서브모듈 다루는 법

- 서브모듈 내부 코드를 직접 수정한 경우: 먼저 해당 서브모듈 디렉터리 안에서 자체적으로 커밋 + push (fork된 저장소 쪽). 그 다음 상위 레포(Stockops-Application)로 돌아와서 서브모듈 포인터가 가리키는 커밋이 바뀐 것을 커밋한다.
- 상위 레포에서 push하기 전에 항상 `git submodule status`로 dirty(`+` 표시) 서브모듈이 없는지 확인한다. dirty한 채로 상위 레포만 push하면 포인터가 깨진 상태로 올라가므로, 발견하면 먼저 정리한 뒤 진행한다.
- 서브모듈을 최신 upstream으로 업데이트할 때는 `--remote` 옵션으로 각 서브모듈이 추적하는 브랜치의 최신 커밋을 가져오고, 상위 레포에 포인터 변경을 커밋한다.

## 에러 자동 해결

다음과 같은 흔한 상황은 알아서 해결하고 결과만 요약 보고한다:

- detached HEAD 상태의 서브모듈 → 추적 브랜치로 checkout 후 진행
- 단순 lockfile/포맷 충돌(merge conflict) → 자동 머지 후 진행
- 코드 충돌 → 양쪽 변경 내용을 분석해서 합리적으로 병합, 애매하면 충돌 부분과 판단 근거를 요약에 포함해서 보고 (이 경우만 진행 전에 알린다)

## 절대 묻지 않아도 되는 것

pull/push 시점, 커밋 단위 나누는 기준, 서브모듈 동기화 여부는 묻지 않는다. 단, **서브모듈에서 fork 원본과 충돌하는 큰 구조적 변경**이거나 **main 브랜치에 직접 push하는 것이 맞는지 애매한 경우**는 멈추고 확인한다.
