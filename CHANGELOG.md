## [2.1.7](https://github.com/oclif/plugin-autocomplete/compare/2.1.6...2.1.7) (2023-03-26)


### Bug Fixes

* **deps:** bump @oclif/core from 2.6.4 to 2.7.1 ([d04b7ef](https://github.com/oclif/plugin-autocomplete/commit/d04b7ef0af08b4547b02e4afa32c64ace4499e70))



## [2.1.6](https://github.com/oclif/plugin-autocomplete/compare/2.1.5...2.1.6) (2023-03-19)


### Bug Fixes

* **deps:** bump @oclif/core from 2.6.2 to 2.6.4 ([ead2102](https://github.com/oclif/plugin-autocomplete/commit/ead2102ba44df28dfe9fa8e2c68fc93d9be80f5b))



## [2.1.5](https://github.com/oclif/plugin-autocomplete/compare/2.1.4...2.1.5) (2023-03-12)


### Bug Fixes

* **deps:** bump @oclif/core from 2.4.0 to 2.6.2 ([a4ea13f](https://github.com/oclif/plugin-autocomplete/commit/a4ea13f7a78159bccf09b368d26146bda2ef983c))



## [2.1.4](https://github.com/oclif/plugin-autocomplete/compare/2.1.3...2.1.4) (2023-03-05)


### Bug Fixes

* **deps:** bump @oclif/core from 2.3.1 to 2.4.0 ([a08df91](https://github.com/oclif/plugin-autocomplete/commit/a08df91533be044f7f3fde2fc782202478275b3d))



## [2.1.3](https://github.com/oclif/plugin-autocomplete/compare/2.1.2...2.1.3) (2023-02-26)


### Bug Fixes

* **deps:** bump @oclif/core from 2.1.7 to 2.3.1 ([0c80ba2](https://github.com/oclif/plugin-autocomplete/commit/0c80ba23fbe9a9a137dc211629f493377f6e7d0a))



## [2.1.2](https://github.com/oclif/plugin-autocomplete/compare/2.1.1...2.1.2) (2023-02-22)


### Bug Fixes

* replace all dashes in autocomplete env var ([#427](https://github.com/oclif/plugin-autocomplete/issues/427)) ([ac82017](https://github.com/oclif/plugin-autocomplete/commit/ac820171c1ddf12f33aa81c1c38fa3a8f24cc78e))



## [2.1.1](https://github.com/oclif/plugin-autocomplete/compare/2.1.0...2.1.1) (2023-02-19)


### Bug Fixes

* **deps:** bump @oclif/core from 2.1.2 to 2.1.7 ([2158f5d](https://github.com/oclif/plugin-autocomplete/commit/2158f5dcecfa15c60642ac6ba09d2282c9a83347))



# [2.1.0](https://github.com/oclif/plugin-autocomplete/compare/1.4.6...2.1.0) (2023-02-15)


### Bug Fixes

* **aliases:** add generic topic description ([b00353f](https://github.com/oclif/plugin-autocomplete/commit/b00353f179373661538d9de34bfe796058c31477))
* allow to switch between comp implementation ([e9b42aa](https://github.com/oclif/plugin-autocomplete/commit/e9b42aa033f2bb0aa6d5841949c95436aafa4528))
* check config.topicSeparator prop ([4890d4f](https://github.com/oclif/plugin-autocomplete/commit/4890d4fa11e0effcb832a1fb6df1f96a5a14ec69))
* complete files by default ([438396f](https://github.com/oclif/plugin-autocomplete/commit/438396f817023a389b77bcade0949f2ecc17dc4e))
* cotopic func missing flags current state ([18cd38d](https://github.com/oclif/plugin-autocomplete/commit/18cd38d90446f94a2d0d053171fba8a1db396798))
* don't gen flag case block if cmd=cotopic ([895e5d3](https://github.com/oclif/plugin-autocomplete/commit/895e5d35d48952cc611734ceb13c4f7eb4cb5fe0))
* generate flag comp for top-level commands ([6ec795e](https://github.com/oclif/plugin-autocomplete/commit/6ec795ed47eb201a4f2a3641da108b4ba4e3b459))
* generate topics for aliases ([ca03e17](https://github.com/oclif/plugin-autocomplete/commit/ca03e1761d07cc2dde4e57f7c1a986c15f6e18e1))
* handle topics without desc ([9a6b4fb](https://github.com/oclif/plugin-autocomplete/commit/9a6b4fb0572f72e9f1f7c92972186208c930465b))
* inline/skip flag comp for top-level args ([a1412d6](https://github.com/oclif/plugin-autocomplete/commit/a1412d68b2bbe4e384c61f5836a2d863765a5608))
* lint fix ([38f3061](https://github.com/oclif/plugin-autocomplete/commit/38f3061e7b236a116cf6888ca778cf9cb8e49e66))
* make arg spec to set `words/CURRENT` ([e260069](https://github.com/oclif/plugin-autocomplete/commit/e2600692788b6a9506b59e00e2d24c968a9afd5d))
* make short/long exclusives ([bb5596a](https://github.com/oclif/plugin-autocomplete/commit/bb5596af192855b488f80ee5e3f53a7f71e4f722))
* oclif v2 changes ([14b4e38](https://github.com/oclif/plugin-autocomplete/commit/14b4e389a616a3c9491a7191a090a9fe2191d320))
* prefer summary over description ([a83b003](https://github.com/oclif/plugin-autocomplete/commit/a83b00311909664d05b539de96a4f4acc18d9351))
* separate flag template for f.options && f.char ([3c6db62](https://github.com/oclif/plugin-autocomplete/commit/3c6db62e1df2651dfc6a58bf32d38c60ba5a9241))
* skip hidden commands ([264995d](https://github.com/oclif/plugin-autocomplete/commit/264995dc83d39276acaa00f926aec9481ced8e67))
* skip hidden flags ([a83ce0c](https://github.com/oclif/plugin-autocomplete/commit/a83ce0c5284217bf1acc85bd44dae039e0985eee))
* skip top-level commands without flags ([f0075d5](https://github.com/oclif/plugin-autocomplete/commit/f0075d538df189675d9b351de68945d8c8069be4))
* support `multiple` flag option ([ed51b14](https://github.com/oclif/plugin-autocomplete/commit/ed51b1481347ef3dc53498ee584aab35e3b75c75))
* wrap flag repeat spec in double quotes ([0d626fb](https://github.com/oclif/plugin-autocomplete/commit/0d626fb77d5288c011144fcf7f5d4fdac7848c36))


### Features

* file completion if no options are defined ([d64c5cc](https://github.com/oclif/plugin-autocomplete/commit/d64c5ccefad762c8cdf807174ba9ae75f6a8d44e))
* support cotopics ([8f7672c](https://github.com/oclif/plugin-autocomplete/commit/8f7672c501b109667d62ddc620cd7d9502b4184e))
* support global help flag ([be3dee4](https://github.com/oclif/plugin-autocomplete/commit/be3dee4c433e22e9c30f62a333cf87a66746f395))
* support space-separated cmds ([9a6c85a](https://github.com/oclif/plugin-autocomplete/commit/9a6c85a1d3a89238b3ce86770b81cfad69ef4718))



## [1.4.6](https://github.com/oclif/plugin-autocomplete/compare/1.4.5...1.4.6) (2023-02-12)


### Bug Fixes

* **deps:** bump @oclif/core from 2.0.8 to 2.1.2 ([1d3e0df](https://github.com/oclif/plugin-autocomplete/commit/1d3e0dfbd5f2a0519f135439d23c68cef93c5f75))



## [1.4.5](https://github.com/oclif/plugin-autocomplete/compare/1.4.4...1.4.5) (2023-02-04)


### Bug Fixes

* **deps:** bump http-cache-semantics from 4.1.0 to 4.1.1 ([7af4768](https://github.com/oclif/plugin-autocomplete/commit/7af4768a45ffec68b5fb7c2b97253ab90e4cf821))



## [1.4.4](https://github.com/oclif/plugin-autocomplete/compare/1.4.3...1.4.4) (2023-01-31)


### Bug Fixes

* support option flags with multiple=true ([#397](https://github.com/oclif/plugin-autocomplete/issues/397)) ([ee06dac](https://github.com/oclif/plugin-autocomplete/commit/ee06dacd25848c79e1586106541ec498f596417a))



## [1.4.3](https://github.com/oclif/plugin-autocomplete/compare/1.4.2...1.4.3) (2023-01-29)


### Bug Fixes

* **deps:** bump @oclif/core from 2.0.3 to 2.0.7 ([ad65d0f](https://github.com/oclif/plugin-autocomplete/commit/ad65d0f67021025aff6f8de2a25465007e735684))



## [1.4.2](https://github.com/oclif/plugin-autocomplete/compare/1.4.1...1.4.2) (2023-01-23)


### Bug Fixes

* bump core ([fcd5856](https://github.com/oclif/plugin-autocomplete/commit/fcd58564d902b611bdb70eefde2d0f26d6726af5))



## [1.4.1](https://github.com/oclif/plugin-autocomplete/compare/1.4.0...1.4.1) (2023-01-19)


### Bug Fixes

* **deps:** bump minimist from 1.2.5 to 1.2.7 ([8437741](https://github.com/oclif/plugin-autocomplete/commit/8437741d01b06a960266e2f323c364cfb70efa2a))



# [1.4.0](https://github.com/oclif/plugin-autocomplete/compare/1.3.10...1.4.0) (2023-01-18)


### Features

* use oclif/core v2 ([bdb41ba](https://github.com/oclif/plugin-autocomplete/commit/bdb41ba671204ce9ca984de9095b7ad44269784e))



## [1.3.10](https://github.com/oclif/plugin-autocomplete/compare/1.3.9...1.3.10) (2023-01-01)


### Bug Fixes

* **deps:** bump json5 from 2.1.3 to 2.2.3 ([34d9233](https://github.com/oclif/plugin-autocomplete/commit/34d9233497a61a8d7d0e70a2349b5df45a349dea))



## [1.3.9](https://github.com/oclif/plugin-autocomplete/compare/1.3.8...1.3.9) (2023-01-01)


### Bug Fixes

* **deps:** bump @oclif/core from 1.22.0 to 1.23.1 ([16d7cb8](https://github.com/oclif/plugin-autocomplete/commit/16d7cb81a96dd13dc764e950497ff7e1be17a0e6))



## [1.3.8](https://github.com/oclif/plugin-autocomplete/compare/1.3.7...1.3.8) (2022-12-18)


### Bug Fixes

* **deps:** bump @oclif/core from 1.21.0 to 1.22.0 ([edc9cd9](https://github.com/oclif/plugin-autocomplete/commit/edc9cd92c023600c72e8ef167af13afa639812bc))



## [1.3.7](https://github.com/oclif/plugin-autocomplete/compare/1.3.6...1.3.7) (2022-12-11)


### Bug Fixes

* **deps:** bump @oclif/core from 1.20.4 to 1.21.0 ([c5ff9a5](https://github.com/oclif/plugin-autocomplete/commit/c5ff9a529b4bb315718cd41659965268084c2a60))



## [1.3.6](https://github.com/oclif/plugin-autocomplete/compare/1.3.5...1.3.6) (2022-11-06)


### Bug Fixes

* **deps:** bump @oclif/core from 1.20.0 to 1.20.4 ([a9a47d2](https://github.com/oclif/plugin-autocomplete/commit/a9a47d24ed07216fdf645e8f1c628972b37c5efa))



## [1.3.5](https://github.com/oclif/plugin-autocomplete/compare/1.3.4...1.3.5) (2022-10-30)


### Bug Fixes

* **deps:** bump @oclif/core from 1.19.1 to 1.20.0 ([80480bc](https://github.com/oclif/plugin-autocomplete/commit/80480bcb2ba584412135524dca866852a551a278))



## [1.3.4](https://github.com/oclif/plugin-autocomplete/compare/1.3.3...1.3.4) (2022-10-23)


### Bug Fixes

* **deps:** bump @oclif/core from 1.18.0 to 1.19.1 ([0d27549](https://github.com/oclif/plugin-autocomplete/commit/0d27549dd4b923be2c860d55477a90d45b87ca22))



## [1.3.3](https://github.com/oclif/plugin-autocomplete/compare/1.3.2...1.3.3) (2022-10-16)


### Bug Fixes

* **deps:** bump @oclif/core from 1.16.5 to 1.18.0 ([c96ccb9](https://github.com/oclif/plugin-autocomplete/commit/c96ccb9c7dd076c69bffa846d4b8623191ba629f))



## [1.3.2](https://github.com/oclif/plugin-autocomplete/compare/1.3.1...1.3.2) (2022-10-09)


### Bug Fixes

* **deps:** bump @oclif/core from 1.16.4 to 1.16.5 ([696a6ed](https://github.com/oclif/plugin-autocomplete/commit/696a6edd72fa4ed93392d70a9fa18945901b528d))



## [1.3.1](https://github.com/oclif/plugin-autocomplete/compare/v1.3.0...1.3.1) (2022-09-27)


### Bug Fixes

* **deps:** bump @oclif/core from 1.7.0 to 1.16.4 ([6aaa72b](https://github.com/oclif/plugin-autocomplete/commit/6aaa72beb449050eef61a969d17c543081bf57e8))



# [1.3.0](https://github.com/oclif/plugin-autocomplete/compare/v1.2.0...v1.3.0) (2022-05-03)


### Features

* aliases support ([a0db49e](https://github.com/oclif/plugin-autocomplete/commit/a0db49e48054f6979f3bf52fe6fbdf590e865d68))



# [1.2.0](https://github.com/oclif/plugin-autocomplete/compare/v1.1.1...v1.2.0) (2022-01-28)


### Features

* remove cli-ux ([2107bc0](https://github.com/oclif/plugin-autocomplete/commit/2107bc0f371fc185e1678e3ee33888b4968ad262))



## [1.1.1](https://github.com/oclif/plugin-autocomplete/compare/v1.1.0...v1.1.1) (2022-01-06)


### Bug Fixes

* bump cli-ux ([fd07ca5](https://github.com/oclif/plugin-autocomplete/commit/fd07ca5c76c0735068e8cd0558dad2add2fdfd19))



# [1.1.0](https://github.com/oclif/plugin-autocomplete/compare/v1.0.0...v1.1.0) (2022-01-04)


### Bug Fixes

* test ([a9a668c](https://github.com/oclif/plugin-autocomplete/commit/a9a668c1626dc5b8f711014bc4c95dabebd949d1))
* whoops, did not mean to include that file ([705d7db](https://github.com/oclif/plugin-autocomplete/commit/705d7db00626304ac30ad3b1824c88fc8dcd85b8))


### Features

* remove moment ([79dc37b](https://github.com/oclif/plugin-autocomplete/commit/79dc37b37600f294c02e85469c1664c83849ff30))



# [1.0.0](https://github.com/oclif/plugin-autocomplete/compare/v0.3.0...v1.0.0) (2021-12-14)


### Bug Fixes

* add unit test ([c544ba8](https://github.com/oclif/plugin-autocomplete/commit/c544ba84a0229936f8842c95aa9c11904514f90e))
* escape chars ([14daa6a](https://github.com/oclif/plugin-autocomplete/commit/14daa6af896fbea5807cd002445e6c32649e28fd))
* include complete command, whoops. ([9b53a63](https://github.com/oclif/plugin-autocomplete/commit/9b53a63eb9b51d0b8e6750071c6500d42792a35d))
* properly encapsulate expanded arrays in "" ([979be23](https://github.com/oclif/plugin-autocomplete/commit/979be23f22983e848f957fcdcfa14bce8d067ddd))
* remove console.log ([2c6e060](https://github.com/oclif/plugin-autocomplete/commit/2c6e0603161fa68f19686e1a0cbd6b50aeb0aaf8))
* unit tests & lint ([f0bfd35](https://github.com/oclif/plugin-autocomplete/commit/f0bfd352fa4f626a2596d5c4e9e0d9b715ea6249))


### Features

* add support for commands separated by spaces (WIP) ([6b5248f](https://github.com/oclif/plugin-autocomplete/commit/6b5248fe28a80e432c8608a91232417b2a0dc073))
* use oclif/core ([#251](https://github.com/oclif/plugin-autocomplete/issues/251)) ([f781819](https://github.com/oclif/plugin-autocomplete/commit/f781819989fa66ace0461a91a49f4cc37ff83c64))



# [0.3.0](https://github.com/oclif/plugin-autocomplete/compare/v0.2.1...v0.3.0) (2020-12-17)


### Bug Fixes

* completion for subcommands ([#126](https://github.com/oclif/plugin-autocomplete/issues/126)) ([30b2857](https://github.com/oclif/plugin-autocomplete/commit/30b2857ed5f0ee9557d150e9ac75038f012c8964)), closes [oclif#9](https://github.com/oclif/issues/9)
* **zsh:** update zsh autocomplete to work with default settings ([#92](https://github.com/oclif/plugin-autocomplete/issues/92)) ([b9e8e7b](https://github.com/oclif/plugin-autocomplete/commit/b9e8e7ba2946c5b16d8af32b70cfffa062880572)), closes [#91](https://github.com/oclif/plugin-autocomplete/issues/91)


### Features

* install on windows bash ([#34](https://github.com/oclif/plugin-autocomplete/issues/34)) ([4ca20e5](https://github.com/oclif/plugin-autocomplete/commit/4ca20e5f840c715fe658f0a12840e34783793995))



## [0.2.1](https://github.com/oclif/plugin-autocomplete/compare/v0.2.0...v0.2.1) (2020-12-11)


### Reverts

* Revert "chore(deps-dev): bump @types/fs-extra from 9.0.1 to 9.0.5 (#163)" (#164) ([0d88c1a](https://github.com/oclif/plugin-autocomplete/commit/0d88c1a68ffb824d8094163ab858a885990b9c76)), closes [#163](https://github.com/oclif/plugin-autocomplete/issues/163) [#164](https://github.com/oclif/plugin-autocomplete/issues/164)



# [0.2.0](https://github.com/oclif/plugin-autocomplete/compare/v0.1.5...v0.2.0) (2020-05-05)


### Features

* update dependencies ([#40](https://github.com/oclif/plugin-autocomplete/issues/40)) ([4b18c97](https://github.com/oclif/plugin-autocomplete/commit/4b18c97c5ce3f88b51535b2c74cbc0906391d34a))



## [0.1.5](https://github.com/oclif/plugin-autocomplete/compare/v0.1.4...v0.1.5) (2019-12-03)


### Bug Fixes

* fallback to file completion if no matches found ([#33](https://github.com/oclif/plugin-autocomplete/issues/33)) ([41b7827](https://github.com/oclif/plugin-autocomplete/commit/41b78271488f2a874ba30aa7b07d53fafbb733a8))



## [0.1.4](https://github.com/oclif/plugin-autocomplete/compare/v0.1.3...v0.1.4) (2019-09-05)


### Bug Fixes

* only use the first line of command/flag descriptions for zsh ([#29](https://github.com/oclif/plugin-autocomplete/issues/29)) ([f3d0e94](https://github.com/oclif/plugin-autocomplete/commit/f3d0e944edcb601a17079d3e05f465103fa540fe))
* sanitize double-quotes in description of commands/flags ([#28](https://github.com/oclif/plugin-autocomplete/issues/28)) ([d8a1fd5](https://github.com/oclif/plugin-autocomplete/commit/d8a1fd5a6ebfa982c5f483bc26b7ea3d5d8bb66f))



## [0.1.3](https://github.com/oclif/plugin-autocomplete/compare/v0.1.2...v0.1.3) (2019-08-01)


### Bug Fixes

* sanitize square brackets in description of commands/flags ([#16](https://github.com/oclif/plugin-autocomplete/issues/16)) ([3bf4821](https://github.com/oclif/plugin-autocomplete/commit/3bf4821ac78bcda65750027657193cab20f445d4))



## [0.1.2](https://github.com/oclif/plugin-autocomplete/compare/v0.1.1...v0.1.2) (2019-07-24)


### Bug Fixes

* sanitize backtick in description of commands/flags ([#12](https://github.com/oclif/plugin-autocomplete/issues/12)) ([65d968f](https://github.com/oclif/plugin-autocomplete/commit/65d968f561db724e81ee4c2f4ff569ed77d69d02))



## [0.1.1](https://github.com/oclif/plugin-autocomplete/compare/3446a6b0bd700c2c94c6f94f3c95115041ef0b4d...v0.1.1) (2019-06-05)


### Bug Fixes

* only use the first line of the command description for zsh ([#10](https://github.com/oclif/plugin-autocomplete/issues/10)) ([3446a6b](https://github.com/oclif/plugin-autocomplete/commit/3446a6b0bd700c2c94c6f94f3c95115041ef0b4d))



